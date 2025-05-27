import { app, InvocationContext } from "@azure/functions";
import { getSAPData } from "../shared/SAPAPIService";
import {
  sapDateTimeToISOString,
  sapDateStringToISOString,
} from "../shared/date-utils";
import {
  getCorrelationId,
  getServiceBusSender,
} from "../shared/service-bus-client";
import { getMessageArchiveClient } from "../shared/message-archive-client";
import {
  ProductionOrderEvent,
  ProductionOrderResponse,
  ProductionOrderComponentResponse,
  ProductionOrderItemResponse,
  ProductionOrderOperationResponse,
  ProductionOrderStatusResponse,
} from "../shared/SAPAPIService.d";
import { ProductionOrderResult } from "./SAPProductionOrderEventHubConsumer.d";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { channel } from "diagnostics_channel";
/* eslint-enable @typescript-eslint/no-unused-vars */

// /A_ProductionOrder_2('1004128')?$format=json&$expand=to_ProductionOrderOperation,to_ProductionOrderItem,to_ProductionOrderComponent,to_ProductionOrderStatus

export const GET_PRODUCTION_ORDER_URL = (productionOrderID) =>
  `${process.env.SAP_API_URL}/productionorder/v1/A_ProductionOrder_2('${encodeURIComponent(productionOrderID)}')?$expand=to_ProductionOrderOperation,to_ProductionOrderItem,to_ProductionOrderComponent,to_ProductionOrderStatus`;

export async function EventHubConsumerHandler(
  // not an array (unknown[]), because cardinality is "one"
  message: ProductionOrderEvent,
  context: InvocationContext,
): Promise<void> {
  const correlationId = getCorrelationId(context);
  const logMetadata: Record<string, unknown> = {
    correlationId: correlationId,
  };

  context.info("Processing message:", JSON.stringify(message));

  // Archive the incoming message
  const containerClient = getMessageArchiveClient(
    context,
    "SAPProductionOrderEventHubConsumer",
  );
  await containerClient.upload(message, "input.json", {
    blobHTTPHeaders: { blobContentType: "application/json" },
    tags: { correlationid: correlationId },
  });
  context.info("Archived incoming message", logMetadata);

  const productionOrderId = `${message["data"]["ProductionOrder"]}`;

  let productionOrder: ProductionOrderResponse = await getProductionOrder(
    productionOrderId,
    context,
  );

  const maxRetries = parseInt(process.env.SAP_API_PRODORDER_MAX_RETRIES ?? "3");
  const lastChangeTimeTreshold = parseInt(
    process.env.SAP_API_PRODORDER_LAST_CHANGE_TIME_THRESHOLD ?? "5000",
  );
  const retryDelay = parseInt(process.env.SAP_API_PRODORDER_RETRY_DELAY);
  let retries = 0;
  // if true, data is considered stale
  while (
    !isNaN(retryDelay) &&
    isDelayed(productionOrder, message, lastChangeTimeTreshold) &&
    retries < maxRetries
  ) {
    // wait for DELAY_TRESHOLD seconds before retriving the data again
    if (retryDelay > 0) {
      await new Promise((f) => setTimeout(f, retryDelay));
    }
    context.info(
      `Production Order ${productionOrderId} data is stale, retrieving data again...`,
    );
    productionOrder = await getProductionOrder(productionOrderId, context);
    retries++;
  }

  if (
    isDelayed(productionOrder, message, lastChangeTimeTreshold) &&
    retries >= maxRetries
  ) {
    context.warn(
      `Production Order ${productionOrderId} data could be stale, tried pulling updated data ${retries} times.`,
    );
  }

  const result: ProductionOrderResult = {
    ...productionOrder.d,
    MfgOrderCreationDateTimeISO: "",
    MfgOrderScheduledEndDateTimeISO: "",
    LastChangeDateTimeISO: "",
    MfgOrderPlannedStartDateTimeISO: "",
    MfgOrderPlannedEndDateTimeISO: "",
    MfgOrderScheduledStartDateTimeISO: "",
    MfgOrderActualReleaseDateISO: "",
    ProductionOrderComponents: [],
    ProductionOrderItems: [],
    ProductionOrderOperations: [],
    ProductionOrderStatuses: [],
  };
  delete result["__metadata"];
  delete result["to_ProductionOrderComponentExt"];
  delete result["to_ProductionOrderComponentExt4"];
  delete result["to_ProductionRsceTools"];
  result["LastChangeDateTimeISO"] = sapDateStringToISOString(
    productionOrder["d"]["LastChangeDateTime"],
  );
  result["MfgOrderCreationDateTimeISO"] = sapDateTimeToISOString(
    result["MfgOrderCreationDate"],
    result["MfgOrderCreationTime"],
  );
  result["MfgOrderScheduledEndDateTimeISO"] = sapDateTimeToISOString(
    result["MfgOrderScheduledEndDate"],
    result["MfgOrderScheduledEndTime"],
  );
  result["MfgOrderPlannedStartDateTimeISO"] = sapDateTimeToISOString(
    result["MfgOrderPlannedStartDate"],
    result["MfgOrderPlannedStartTime"],
  );
  result["MfgOrderPlannedEndDateTimeISO"] = sapDateTimeToISOString(
    result["MfgOrderPlannedEndDate"],
    result["MfgOrderPlannedEndTime"],
  );
  result["MfgOrderScheduledStartDateTimeISO"] = sapDateTimeToISOString(
    result["MfgOrderScheduledStartDate"],
    result["MfgOrderScheduledStartTime"],
  );
  result["MfgOrderActualReleaseDateISO"] = sapDateTimeToISOString(
    result["MfgOrderActualReleaseDate"],
  );

  const productionOrderComponents: ProductionOrderComponentResponse =
    productionOrder.d.to_ProductionOrderComponent;
  result["ProductionOrderComponents"] = productionOrderComponents.results.map(
    (component) => {
      delete component["__metadata"];
      return {
        ...component,
        MatlCompRequirementDateTimeISO: sapDateTimeToISOString(
          component["MatlCompRequirementDate"],
          component["MatlCompRequirementTime"],
        ),
      };
    },
  );
  delete result["to_ProductionOrderComponent"];

  const productionOrderItems: ProductionOrderItemResponse =
    productionOrder.d.to_ProductionOrderItem;
  result["ProductionOrderItems"] = productionOrderItems.results.map((item) => {
    delete item["__metadata"];
    return {
      ...item,
      MfgOrderItemPlndDeliveryDateISO:
        item["MfgOrderItemPlndDeliveryDate"] == null
          ? null
          : sapDateTimeToISOString(item["MfgOrderItemPlndDeliveryDate"]),
      MfgOrderItemActualDeliveryDateISO:
        item["MfgOrderItemActualDeliveryDate"] == null
          ? null
          : sapDateTimeToISOString(item["MfgOrderItemActualDeliveryDate"]),
    };
  });
  delete result["to_ProductionOrderItem"];

  const productionOrderOperations: ProductionOrderOperationResponse =
    productionOrder.d.to_ProductionOrderOperation;
  result["ProductionOrderOperations"] = productionOrderOperations.results.map(
    (operation) => {
      delete operation["__metadata"];
      return {
        ...operation,
        OpErlstSchedldExecStrtDteTmeISO: sapDateTimeToISOString(
          operation["OpErlstSchedldExecStrtDte"],
          operation["OpErlstSchedldExecStrtTme"],
        ),
        OpErlstSchedldExecEndDteTmeISO: sapDateTimeToISOString(
          operation["OpErlstSchedldExecEndDte"],
          operation["OpErlstSchedldExecEndTme"],
        ),
        OpActualExecutionStartDateTimeISO:
          operation["OpActualExecutionStartDate"] == null
            ? null
            : sapDateTimeToISOString(
                operation["OpActualExecutionStartDate"],
                operation["OpActualExecutionStartTime"],
              ),
        OpActualExecutionEndDateTimeISO:
          operation["OpActualExecutionEndDate"] == null
            ? null
            : sapDateTimeToISOString(
                operation["OpActualExecutionEndDate"],
                operation["OpActualExecutionEndTime"],
              ),
        OpErlstSchedldProcgStrtDteTmeISO: sapDateTimeToISOString(
          operation["OpErlstSchedldProcgStrtDte"],
          operation["OpErlstSchedldProcgStrtTme"],
        ),
        OpErlstSchedldTrdwnStrtDteTmeISO: sapDateTimeToISOString(
          operation["OpErlstSchedldTrdwnStrtDte"],
          operation["OpErlstSchedldTrdwnStrtTme"],
        ),
        LastChangeDateTimeISO: sapDateStringToISOString(
          operation["LastChangeDateTime"],
        ),
      };
    },
  );
  delete result["to_ProductionOrderOperation"];

  const productionOrderStatuses: ProductionOrderStatusResponse =
    productionOrder.d.to_ProductionOrderStatus;
  result["ProductionOrderStatuses"] = productionOrderStatuses.results.map(
    (status) => {
      delete status["__metadata"];
      return status;
    },
  );
  delete result["to_ProductionOrderStatus"];

  await getServiceBusSender(
    process.env.PRODUCTION_ORDER_SERVICE_BUS_TOPIC_NAME,
  ).sendMessages({
    body: result,
    contentType: "application/json",
    correlationId: correlationId,
    sessionId: productionOrderId,
  });
  context.log(
    "Sent message to",
    process.env.PRODUCTION_ORDER_SERVICE_BUS_TOPIC_NAME,
    logMetadata,
  );

  // Send the message to the archive
  await containerClient.upload(result, `output.json`, {
    blobHTTPHeaders: { blobContentType: "application/json" },
    tags: { correlationid: `${context.triggerMetadata.correlationId}` },
  });
}

app.eventHub("SAPProductionOrderEventHubConsumer", {
  connection: "SapEventHubConnection",
  eventHubName: "%PRODUCTION_ORDER_EVENT_HUB_NAME%",
  consumerGroup: "%PRODUCTION_ORDER_EVENT_HUB_CONSUMER_GROUP%",
  cardinality: "one",
  handler: EventHubConsumerHandler,
});

app.serviceBusTopic("SAPProductionOrderReceiver", {
  connection: "MesServiceBusConnection",
  topicName: "production-order-sap-topic",
  subscriptionName: "production-order-sap-topic-azure-function",
  handler: EventHubConsumerHandler,
});

async function getProductionOrder(
  productionOrderId: string,
  context: InvocationContext,
): Promise<ProductionOrderResponse> {
  let productionOrder: ProductionOrderResponse = undefined;
  try {
    productionOrder = await getSAPData(
      GET_PRODUCTION_ORDER_URL(productionOrderId),
      context,
    );
  } catch (error) {
    context.log("Error while fetching Production Order from SAP API:", error);
    throw error;
  }

  return productionOrder;
}

// Returns true if the production order data is stale - the last change data time of returned the production order is older than event timestamp
function isDelayed(productionOrder, message, lastChangeTimeTreshold) {
  const lastChangeDateTimeISO = sapDateStringToISOString(
    productionOrder["d"]["LastChangeDateTime"],
  );
  const eventTimestamp = new Date(message["time"]);
  const timeDifference =
    eventTimestamp.getTime() - new Date(lastChangeDateTimeISO).getTime();
  return timeDifference > lastChangeTimeTreshold;
}
