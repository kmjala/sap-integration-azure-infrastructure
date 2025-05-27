import { app, InvocationContext } from "@azure/functions";
import {
  getCorrelationId,
  getServiceBusSender,
} from "../shared/service-bus-client";
import { getSAPData } from "../shared/SAPAPIService";
import { getMessageArchiveClient } from "../shared/message-archive-client";
import {
  InspectionLotEvent,
  InspectionLotResponse,
  InspectionLotStatusResponse,
  BatchResponse,
  BatchCharcResponse,
  CharcDescriptionResponse,
  BatchCharcValueResponse,
} from "../shared/SAPAPIService.d";
import {
  InspectionLotResult,
  BatchResult,
} from "./SAPInspectionLotEventHubConsumer.d";

export const GET_INSPECTION_LOT_URL = (inspectionLotID) =>
  `${process.env.SAP_API_URL}/inspectionlot/v1/A_InspectionLot('${encodeURIComponent(inspectionLotID)}')?$expand=to_InspectionLotWithStatus`;
export const GET_BATCH_URL = (materialNumber, batch, batchIdentifyingPlant) =>
  `${process.env.SAP_API_URL}/batchmaster/v1/Batch(Material='${encodeURIComponent(materialNumber)}',BatchIdentifyingPlant='${encodeURIComponent(batchIdentifyingPlant)}',Batch='${encodeURIComponent(batch)}')?$expand=to_BatchCharc`;
export const GET_CHARACTERISTIC_DESCRIPTION_URL = (charcInternalD) =>
  `${process.env.SAP_API_URL}/classificationcharacteristic/v1/A_ClfnCharcDescForKeyDate(CharcInternalID='${encodeURIComponent(charcInternalD)}',Language='EN')`;
export const GET_CHARACTERISTIC_VALUE_URL = (
  materialNumber,
  batchIdentifyingPlant,
  batch,
  charcInternalD,
) =>
  `${process.env.SAP_API_URL}/batchmaster/v1/BatchCharc(Material='${encodeURIComponent(materialNumber)}',BatchIdentifyingPlant='${encodeURIComponent(batchIdentifyingPlant)}',Batch='${encodeURIComponent(batch)}',CharcInternalID='${encodeURIComponent(charcInternalD)}')/to_BatchCharcValue`;

export async function EventHubConsumerHandler(
  // not an array (unknown[]), because cardinality is "one"
  message: InspectionLotEvent,
  context: InvocationContext,
): Promise<void> {
  context.log("Processed message:", message);

  const correlationId = getCorrelationId(context);
  const logMetadata: Record<string, unknown> = {
    correlationId: correlationId,
  };

  // Archive the incoming message
  const containerClient = getMessageArchiveClient(
    context,
    "SAPInspectionLotEventHubConsumer",
  );
  await containerClient.upload(message, "input.json", {
    blobHTTPHeaders: { blobContentType: "application/json" },
    tags: { correlationid: correlationId },
  });
  context.info("Archived incoming message", logMetadata);

  const inspectionLotId = message["data"]["InspectionLot"];
  let inspectionLot: InspectionLotResponse = undefined;
  try {
    inspectionLot = await getSAPData(
      GET_INSPECTION_LOT_URL(inspectionLotId),
      context,
    );
  } catch (error) {
    context.log(`Error retrieving Inspection Lot using SAP API: ${error}`);
    throw error;
  }

  context.log("##### got inspection lot :" + JSON.stringify(inspectionLot));
  delete inspectionLot["d"]["__metadata"];
  const result: InspectionLotResult = {
    ...inspectionLot["d"],
    InspectionLotStatus: {
      InspectionLot: "",
    },
  };

  const inspectionLotStatus: InspectionLotStatusResponse =
    inspectionLot.d.to_InspectionLotWithStatus;

  context.log(
    "##### got inspection lot status:" + JSON.stringify(inspectionLotStatus),
  );
  delete inspectionLotStatus["__metadata"];

  result["InspectionLotStatus"] = {
    ...inspectionLotStatus,
    InspectionLot: inspectionLotId,
  };
  delete result["to_InspectionLotWithStatus"];

  const batchId = result["Batch"];
  const materialNumber = result["Material"];
  const batchIdentifyingPlant = ""; // TODO check this
  const batch = await getBatch(
    materialNumber,
    batchId,
    batchIdentifyingPlant,
    context,
  );
  result["Batch"] = batch;
  if (batch != null) {
    delete result["Batch"]["to_BatchCharc"];
  }
  await getServiceBusSender(
    process.env.INSPECTION_LOT_SERVICE_BUS_TOPIC_NAME,
  ).sendMessages({
    body: result,
    contentType: "application/json",
    correlationId: correlationId,
    sessionId: `${batch["Batch"]}`,
  });
  context.log(
    "Sent message to",
    process.env.INSPECTION_LOT_SERVICE_BUS_TOPIC_NAME,
    logMetadata,
  );

  // Send the message to the archive
  await containerClient.upload(result, `output.json`, {
    blobHTTPHeaders: { blobContentType: "application/json" },
    tags: { correlationid: `${context.triggerMetadata.correlationId}` },
  });
}

async function getBatch(
  materialNumber,
  batchId,
  batchIdentifyingPlant,
  context,
) {
  let batch: BatchResponse;
  try {
    batch = await getSAPData(
      GET_BATCH_URL(materialNumber, batchId, batchIdentifyingPlant),
      context,
    );
  } catch (error) {
    context.log(`Error retrieving Batch using SAP API: ${error}`);
    return null;
  }
  delete batch["d"]["__metadata"];
  delete batch["d"]["to_BatchPlant"];
  delete batch["d"]["to_BatchClass"];
  delete batch["d"]["to_BatchText"];
  const result: BatchResult = {
    ...batch["d"],
    BatchCharc: [],
  };
  let batchCharacteristics = [];

  batchCharacteristics = await fetchCharacteristics(batch, context);
  result["BatchCharc"] = batchCharacteristics;
  return result;
}

async function fetchCharacteristics(batch, context) {
  const batchCharacteristics: BatchCharcResponse = batch.d.to_BatchCharc;
  const promises = [];
  for (const charc of batchCharacteristics["results"]) {
    const charcMaterial = charc["Material"];
    context.log("##### charcMaterial: " + charcMaterial);
    const charcDetailsPromise = fetchCharacteristicDetails(
      charcMaterial,
      batch.d.Batch,
      batch.d.BatchIdentifyingPlant,
      charc["CharcInternalID"],
      context,
    );
    promises.push(charcDetailsPromise);
  }
  const values = await Promise.all(promises);
  return values.filter((value) => value != null);
}

async function fetchCharacteristicDetails(
  materialNumber,
  batch,
  batchIdentifyingPlant,
  charcInternalID,
  context,
): /* eslint-disable @typescript-eslint/no-explicit-any */
Promise<any> {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const characteristic = {};
  let characteristicDescription: CharcDescriptionResponse = undefined;
  try {
    characteristicDescription = await getSAPData(
      GET_CHARACTERISTIC_DESCRIPTION_URL(charcInternalID),
      context,
    );
  } catch (error) {
    context.error(
      `Error retrieving Characteristic Description using SAP API: ${error.stack ?? error}`,
    );
    return null;
  }
  delete characteristicDescription["d"]["__metadata"];
  characteristic["Description"] = characteristicDescription["d"];
  let characteristicValue: BatchCharcValueResponse = undefined;
  try {
    characteristicValue = await getSAPData(
      GET_CHARACTERISTIC_VALUE_URL(
        materialNumber,
        batchIdentifyingPlant,
        batch,
        charcInternalID,
      ),
      context,
    );
  } catch (error) {
    context.error(
      `Error retrieving Characteristic Value using SAP API: ${error.stack ?? error}`,
    );
    return null;
  }
  for (const val of characteristicValue["d"]["results"]) {
    delete val["__metadata"];
    delete val["to_BatchCharc"];
  }
  characteristic["Valuation"] =
    characteristicValue == null ? null : characteristicValue["d"]["results"];
  return characteristic;
}

app.eventHub("SAPInspectionLotEventHubConsumer", {
  connection: "SapEventHubConnection",
  eventHubName: "%INSPECTION_LOT_EVENT_HUB_NAME%",
  consumerGroup: "%INSPECTION_LOT_EVENT_HUB_CONSUMER_GROUP%",
  cardinality: "one",
  handler: EventHubConsumerHandler,
});

app.serviceBusTopic("SAPInspectionLotReceiver", {
  connection: "MesServiceBusConnection",
  topicName: "inspection-lot-sap-topic",
  subscriptionName: "inspection-lot-sap-topic-azure-function",
  handler: EventHubConsumerHandler,
});
