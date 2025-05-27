import { app, InvocationContext } from "@azure/functions";
import {
  getCorrelationId,
  getServiceBusSender,
} from "../shared/service-bus-client";
import { getSAPData } from "../shared/SAPAPIService";
import {
  getMessageArchiveClient,
  archiveMessage,
} from "../shared/message-archive-client";
import { COADeliveryDocumentEvent } from "../shared/SAPAPIService.d";

import * as appInsights from "applicationinsights";

export const GET_FREIGHT_ORDERS = (freightOrder) =>
  `${process.env.SAP_API_URL}/freightordercoa/v1/ZFODELCOASet?$filter=FreightOrder eq '${encodeURIComponent(freightOrder)}'`;

function getCountryName(countryCode: string): string {
  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  return regionNames.of(countryCode);
}

export async function EventHubConsumerHandler(
  // not an array (unknown[]), because cardinality is "one"
  message: COADeliveryDocumentEvent,
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
    "SAPCOADeliveryEventHubConsumer",
  );
  await containerClient.upload(message, "input.json", {
    blobHTTPHeaders: { blobContentType: "application/json" },
    tags: { correlationid: correlationId },
  });
  context.info("Archived incoming message", logMetadata);

  const freightOrderId = message["data"]["FO"];
  let freightOrders = [];
  try {
    freightOrders = await getSAPData(
      GET_FREIGHT_ORDERS(freightOrderId),
      context,
    );
  } catch (error) {
    context.log(`Error retrieving Freight Orders using SAP API: ${error}`);
    throw error;
  }

  context.log("appinsights config");
  context.log(JSON.stringify(appInsights.defaultClient.config));

  // Track the dependency telemetry for the SAP API call
  appInsights.defaultClient.trackDependency({
    name: "GET /freightordercoa/v1/ZFODELCOASet",
    resultCode: 200,
    data: GET_FREIGHT_ORDERS(freightOrderId),
    dependencyTypeName: "HTTP",
    target: process.env.SAP_API_URL,
    duration: 342,
    success: true,
  });

  const freightOrdersList = [];
  for (const freightOrder of freightOrders["d"]["results"]) {
    delete freightOrder["__metadata"];
    // convert country codes to country names
    freightOrder["PlantCountryName"] = getCountryName(
      freightOrder["PlantCountry"],
    );
    freightOrder["CustomerCountryName"] = getCountryName(
      freightOrder["CustomerCountry"],
    );
    freightOrdersList.push(freightOrder);
  }
  const result = freightOrdersList;

  // Save the message to the archive
  const outputMessageBlobPath = await archiveMessage(
    result,
    `output.json`,
    context,
    containerClient,
  );

  context.info("### Archived output message", outputMessageBlobPath);

  const serviceBusMessage = {
    outputMessageBlobPath: outputMessageBlobPath,
    freightOrderId: freightOrderId,
  };

  // Send the reference to the result message to the Service Bus topic
  await getServiceBusSender(
    process.env.COA_INTEGRATION_SERVICE_BUS_TOPIC_NAME,
  ).sendMessages({
    body: serviceBusMessage,
    contentType: "application/json",
    correlationId: correlationId,
    sessionId: freightOrderId,
  });
  context.log(
    "Sent message to",
    process.env.COA_INTEGRATION_SERVICE_BUS_TOPIC_NAME,
    logMetadata,
  );
}

app.eventHub("SAPCOADeliveryEventHubConsumer", {
  connection: "SapEventHubConnection",
  eventHubName: "%COA_DELIVERY_EVENT_HUB_NAME%",
  consumerGroup: "%COA_DELIVERY_EVENT_HUB_CONSUMER_GROUP%",
  cardinality: "one",
  handler: EventHubConsumerHandler,
});

app.serviceBusTopic("SAPCOADeliveryReceiver", {
  connection: "MesServiceBusConnection",
  topicName: "coa-integration-sap-topic",
  subscriptionName: "coa-integration-sap-topic-azure-function",
  handler: EventHubConsumerHandler,
});
