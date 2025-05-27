import { EventHubConsumerHandler } from "../../src/functions/SAPCOADeliveryEventHubConsumer";
import { InvocationContext } from "@azure/functions";
import testInput from "../resources/SAPCOADeliveryEventHubConsumer/input.json";
import getFreightOrdersSAPAPIResponseMock from "../resources/SAPCOADeliveryEventHubConsumer/sap-api-get-freight-orders-mock.json";
import expectedJson from "../resources/SAPCOADeliveryEventHubConsumer/expected.json";
import expectedServiceBusMessage from "../resources/SAPCOADeliveryEventHubConsumer/expected-service-bus-message.json";
import { when } from "jest-when";
import { getSAPData } from "../../src/shared/SAPAPIService";
import { GET_FREIGHT_ORDERS } from "../../src/functions/SAPCOADeliveryEventHubConsumer";
import { ContainerClient } from "@azure/storage-blob";
import { ServiceBusClient } from "@azure/service-bus";
import { createBlobNamePrefix } from "../../src/shared/message-archive-client";

jest.mock("@azure/storage-blob");
jest.mock("@azure/service-bus");
jest.mock("@azure/functions", () => ({
  ...(jest.requireActual("@azure/functions") as object),
  // Mock "app" to avoid registering the functions
  app: {
    serviceBusTopic: jest.fn(),
    eventHub: jest.fn(),
  },
}));

// mock applicationinsights defaultClient.trackDependency
jest.mock("applicationinsights", () => ({
  defaultClient: {
    addTelemetryProcessor: jest.fn(),
    trackDependency: jest.fn(),
    trackRequest: jest.fn(),
    trackTrace: jest.fn(),
  },
}));

jest.mock("../../src/shared/service-bus-client", () => ({
  ...jest.requireActual("../../src/shared/service-bus-client"),
  getCorrelationId: function () {
    return "test-correlation-id";
  },
}));

jest.mock("../../src/shared/SAPAPIService", () => ({
  ...jest.requireActual("../../src/shared/SAPAPIService"),
  getSAPData: jest.fn(),
}));

describe("SAP Batch Event Hub Consumer Test", () => {
  const uploadMockFn = jest.fn();
  const sendMessagesMockFn = jest.fn();

  beforeEach(() => {
    (ContainerClient as jest.Mock).mockImplementation(() => ({
      getBlockBlobClient: jest.fn().mockImplementation(() => ({
        upload: uploadMockFn,
      })),
    }));
    (ServiceBusClient as jest.Mock).mockImplementation(() => ({
      createSender: jest.fn().mockReturnValue({
        sendMessages: sendMessagesMockFn,
      }),
    }));
  });

  it("Successfully sends COA message", async () => {
    const context = new InvocationContext({
      functionName: "SAPCOADeliveryEventHubConsumer",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    process.env.SAP_API_URL = "my-awesome-sap-api-url";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const freightOrderID = testInput["data"]["FO"];

    when(getSAPData)
      .calledWith(GET_FREIGHT_ORDERS(freightOrderID), context)
      .mockResolvedValue(getFreightOrdersSAPAPIResponseMock);

    await EventHubConsumerHandler(testInput, context);

    // Assert that the output message was archived
    expect(uploadMockFn).toHaveBeenNthCalledWith(
      1,
      JSON.stringify(testInput),
      JSON.stringify(testInput).length,
      expect.any(Object),
    );

    expect(uploadMockFn).toHaveBeenNthCalledWith(
      2,
      JSON.stringify(expectedJson),
      JSON.stringify(expectedJson).length,
      expect.any(Object),
    );

    const expectedBlobPrefix = createBlobNamePrefix(
      context,
      context.functionName,
    );
    expectedServiceBusMessage["outputMessageBlobPath"] =
      `${expectedBlobPrefix}/output.json`;

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedServiceBusMessage,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: freightOrderID,
    });
  });
});
