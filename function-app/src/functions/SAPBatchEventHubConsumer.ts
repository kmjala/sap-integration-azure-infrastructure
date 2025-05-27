import { app, InvocationContext } from "@azure/functions";
import { getSAPData } from "../shared/SAPAPIService";
import {
  getCorrelationId,
  getServiceBusSender,
} from "../shared/service-bus-client";
import { getMessageArchiveClient } from "../shared/message-archive-client";

export const GET_BATCH_URL = (materialNumber, batch, batchIdentifyingPlant) =>
  `${process.env.SAP_API_URL}/batchmaster/v1/Batch(Material='${encodeURIComponent(materialNumber)}',BatchIdentifyingPlant='${encodeURIComponent(batchIdentifyingPlant)}',Batch='${encodeURIComponent(batch)}')?$expand=to_BatchPlant,to_BatchCharc`;

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

  // Archive the incoming message
  const containerClient = getMessageArchiveClient(
    context,
    "SAPBatchEventHubConsumer",
  );
  await containerClient.upload(message, "input.json", {
    blobHTTPHeaders: { blobContentType: "application/json" },
    tags: { correlationid: correlationId },
  });
  context.info("Archived incoming message", logMetadata);

  const batchId = `${message["data"]["Batch"]}`;
  const materialNumber = message["data"]["Material"];
  const batchIdentifyingPlant = message["data"]["BatchIdentifyingPlant"];

  let response = undefined;
  try {
    response = await getSAPData(
      GET_BATCH_URL(materialNumber, batchId, batchIdentifyingPlant),
      context,
    );
  } catch (error) {
    context.log(`Error retrieving Batch ${batchId}.`);
    throw error;
  }

  context.log("Batch SAP API Data:", response);
  const batch = response.d;

  const plants = [];
  response = batch.to_BatchPlant;
  response.results.forEach((plantData) => {
    plants.push(plantData.Plant);
  });

  const result = {
    Batch: batch.Batch,
    Material: batch.Material,
    BatchIdentifyingPlants: plants,
    BatchBySupplier: batch.BatchBySupplier,
    Supplier: batch.Supplier,
    ShelfLifeExpirationDate: batch.ShelfLifeExpirationDate,
    BatchCharc: [], // TODO get Batch Characteristics
    // TODO map missing fields - Inspection Lot API
    // Purchase Order Number
    // Order Type - type of purchase order
    // Quantity - User Defined Quantity 01 - quantity on the batch
    // Location - we don't use it in MESA, it is needed for Compass and Nemo, PSA (Production Storage Area)
    // Unit of Measure - batch unit of measure
    // Batch Characteristic - Supplier piece
    // Batch Characteristic - Supplier Dyelot
    // Date of last goods receipt - delete for now
  };

  await getServiceBusSender(
    process.env.BATCH_SERVICE_BUS_TOPIC_NAME,
  ).sendMessages({
    body: result,
    contentType: "application/json",
    correlationId: correlationId,
    sessionId: batchId,
  });
  context.log(
    "Sent message to",
    process.env.BATCH_SERVICE_BUS_TOPIC_NAME,
    logMetadata,
  );

  // Send the message to the archive
  await containerClient.upload(result, `output.json`, {
    blobHTTPHeaders: { blobContentType: "application/json" },
    tags: { correlationid: `${context.triggerMetadata.correlationId}` },
  });
}

app.eventHub("SAPBatchEventHubConsumer", {
  connection: "SapEventHubConnection",
  eventHubName: "%BATCH_EVENT_HUB_NAME%",
  consumerGroup: "%BATCH_EVENT_HUB_CONSUMER_GROUP%",
  cardinality: "one",
  handler: EventHubConsumerHandler,
});

app.serviceBusTopic("SAPBatchReceiver", {
  connection: "MesServiceBusConnection",
  topicName: "batch-sap-topic",
  subscriptionName: "batch-sap-topic-azure-function",
  handler: EventHubConsumerHandler,
});
