import { app, InvocationContext, output } from "@azure/functions";
import {
  getCorrelationId,
  getServiceBusSender,
} from "../shared/service-bus-client";
import { getMessageArchiveClient } from "../shared/message-archive-client";
import {
  WarehouseAvailableStockResponse,
  ProductMasterResponse,
} from "../shared/SAPAPIService.d";
export const GET_BATCH_URL = (materialNumber, batch, batchIdentifyingPlant) =>
  `${process.env.SAP_API_URL}/batchmaster/v1/Batch(Material='${encodeURIComponent(materialNumber)}',BatchIdentifyingPlant='${encodeURIComponent(batchIdentifyingPlant)}',Batch='${encodeURIComponent(batch)}')?$format=json&$expand=to_BatchCharc`;
export const GET_CHARACTERISTIC_DESCRIPTION_URL = (charcInternalD) =>
  `${process.env.SAP_API_URL}/classificationcharacteristic/v1/A_ClfnCharcDescForKeyDate(CharcInternalID='${encodeURIComponent(charcInternalD)}',Language='EN')?$format=json`;
export const GET_PRODUCT_MASTER_DATA_URL = (materialNumber) =>
  `${process.env.SAP_API_URL}/materialclassification/v1/A_ClfnProduct('${encodeURIComponent(materialNumber)}')`;
import {
  getCharacteristicDetails,
  getProductMaster,
  getSAPData,
} from "../shared/SAPAPIService";
import { A_ProductClassType } from "../shared/API_CLFN_PRODUCT_SRV";

export const GET_WAREHOUSE_AVAILABLE_STOCK_URL = (
  warehouse,
  storageType,
  material,
  batch,
) =>
  `${process.env.SAP_API_URL}/whseavailablestock/v1/WarehouseAvailableStock?$filter=EWMWarehouse eq '${encodeURIComponent(warehouse)}' and EWMStorageType eq '${encodeURIComponent(storageType)}' and Product eq '${encodeURIComponent(material)}' and Batch eq '${encodeURIComponent(batch)}'`;

export async function EventHubConsumerHandler(
  // not an array (unknown[]), because cardinality is "one"
  message: unknown,
  context: InvocationContext,
): Promise<void> {
  context.log("Processed message:", message);
  const correlationId = getCorrelationId(context);
  const logMetadata: Record<string, unknown> = {
    correlationId: correlationId,
  };
  const containerClient = getMessageArchiveClient(
    context,
    "SAPInventoryLocationMoveEventHubConsumer",
  );
  await containerClient.upload(message, "input.json", {
    blobHTTPHeaders: { blobContentType: "application/json" },
    tags: { correlationid: correlationId },
  });
  context.info("Archived incoming message", logMetadata);

  const warehouse = message["data"]["EWMWarehouse"];
  const storageType = message["data"]["EWMStorageType"];
  const batch = `${message["data"]["Batch"]}`;
  const materialNumber = message["data"]["Product"];

  // GET Material Master Information to determine if material is mes relevant

  const productMaster: ProductMasterResponse = await getProductMaster(
    materialNumber,
    context,
  );
  if (productMaster == null) {
    const errorMessage = `No product master data found in SAP for material number ${materialNumber}`;
    context.log(errorMessage, logMetadata);
    throw new Error(errorMessage);
  }

  const batchMaster = !batch
    ? batch
    : await getSAPData(GET_BATCH_URL(materialNumber, batch, ""), context);

  const classAssignmentsList = await fetchProductMasterClassAssignments(
    materialNumber,
    productMaster,
    context,
  );

  const url = GET_WAREHOUSE_AVAILABLE_STOCK_URL(
    warehouse,
    storageType,
    materialNumber,
    batch,
  );

  const response: WarehouseAvailableStockResponse = await getSAPData(
    url,
    context,
  );
  if (response == null || response["value"] == undefined) {
    context.log(
      "No data found in SAP API for URL",
      GET_WAREHOUSE_AVAILABLE_STOCK_URL,
    );
    throw new Error(
      "No data found in SAP API for URL:" + GET_WAREHOUSE_AVAILABLE_STOCK_URL,
    );
  }
  const resultOutputMessages = await filterResultMessages(
    message["data"],
    response,
    warehouse,
    storageType,
    productMaster,
    batchMaster,
    classAssignmentsList,
  );

  if (resultOutputMessages.length === 0) {
    context.log("No output messages to send");
    return;
  }

  for (const outputMessage of resultOutputMessages) {
    context.info("#### outputMessage: ", JSON.stringify(outputMessage));
    await getServiceBusSender(
      process.env.INVENTORY_LOCATION_MOVE_SERVICE_BUS_TOPIC_NAME,
    ).sendMessages({
      body: outputMessage,
      contentType: "application/json",
      correlationId: correlationId,
      sessionId: `${materialNumber}-${batch}`,
    });
    context.log(
      "Sent message to",
      process.env.INVENTORY_LOCATION_MOVE_SERVICE_BUS_TOPIC_NAME,
      logMetadata,
    );
  }

  for (const outputMessage of resultOutputMessages) {
    await containerClient.upload(outputMessage, "output.json", {
      blobHTTPHeaders: { blobContentType: "application/json" },
      tags: { correlationid: correlationId },
    });
    context.info("Archived output message", logMetadata);
  }
}

async function filterResultMessages(
  inputData,
  response,
  warehouse,
  storageType,
  productMaster: ProductMasterResponse,
  batchMaster,
  classAssignmentsList,
) {
  const resultOutputMessages = [];
  const batch = !batchMaster ? null : batchMaster["d"];

  delete productMaster["d"]["__metadata"];
  delete productMaster["d"]["to_Description"];
  delete productMaster["d"]["to_Plant"];
  delete productMaster["d"]["to_ProductCharc"];
  delete productMaster["d"]["to_ProductClass"];
  delete productMaster["d"]["to_ProductSalesTax"];
  delete productMaster["d"]["to_SalesDelivery"];

  if (response["value"].length === 0) {
    // No stock available, send message to MES
    const outputMessage = {
      EWMWarehouse: warehouse,
      EWMStorageType: storageType,
      Product: productMaster["d"],
      Batch: batch,
      EWMStorageBin: null,
      AvailableEWMStockQty: 0,
      ShelfLifeExpirationDate: null,
      EWMStockQtyBaseUnitISOCode: inputData["EWMStockQtyBaseUnitISOCode"],
      EWMStockType: inputData["EWMStockType"],
    };
    outputMessage["Product"]["ProductClass"] = classAssignmentsList;
    resultOutputMessages.push(outputMessage);
    return resultOutputMessages;
  }
  const outputMessages = response["value"];
  for (const outputMessage of outputMessages) {
    outputMessage["Product"] = productMaster["d"];
    outputMessage["Product"]["ProductClass"] = classAssignmentsList;
    outputMessage["Batch"] = batch;
    resultOutputMessages.push(outputMessage);
  }
  return resultOutputMessages;
}

async function fetchProductMasterClassAssignments(
  materialNumber: string,
  productMaster: ProductMasterResponse,
  context: InvocationContext,
) {
  if (productMaster.d.to_ProductClass.results.length === 0) {
    context.info(
      `No class assignments found in SAP for material number ${materialNumber}`,
    );
    return [];
  }

  const promises = productMaster.d.to_ProductClass.results.map(
    (classAssignment) => fetchClassCharacteristicData(classAssignment, context),
  );
  return await Promise.all(promises);
}

async function fetchClassCharacteristicData(
  classAssignment: A_ProductClassType,
  context: InvocationContext,
) {
  const classCharacteristics = classAssignment.to_Characteristics;
  const classCharacteristicsResult = await Promise.all(
    classCharacteristics.results.map(async (characteristic) => {
      const description = await getCharacteristicDetails(
        characteristic.CharcInternalID,
        context,
      );
      return {
        Description: description,
        Valuation: characteristic.to_Valuation.results,
      };
    }),
  );
  return {
    ClassDetails: classAssignment.to_ClassDetails,
    ProductClassCharc: classCharacteristicsResult,
  };
}

app.eventHub("SAPInverntoryLocationMoveEventHubConsumer", {
  connection: "SapEventHubConnection",
  eventHubName: "%INVENTORY_LOCATION_MOVE_EVENT_HUB_NAME%",
  consumerGroup: "%INVENTORY_LOCATION_MOVE_EVENT_HUB_CONSUMER_GROUP%",
  cardinality: "one",
  handler: EventHubConsumerHandler,
  return: output.serviceBusTopic({
    connection: "MesServiceBusConnection",
    topicName: "%INVENTORY_LOCATION_MOVE_SERVICE_BUS_TOPIC_NAME%",
  }),
});

app.serviceBusTopic("SAPInventoryLocationMoveReceiver", {
  connection: "MesServiceBusConnection",
  topicName: "inventory-location-move-sap-topic",
  subscriptionName: "inventory-location-move-sap-topic-azure-function",
  handler: EventHubConsumerHandler,
});
