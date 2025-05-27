import { EventHubConsumerHandler } from "../../src/functions/SAPBatchEventHubConsumer";
import { InvocationContext } from "@azure/functions";
import testInput from "../resources/SAPBatchEventHubConsumer/input.json";
import getBatchSAPAPIResponseMock from "../resources/SAPBatchEventHubConsumer/sap-api-get-batch-master-mock.json";
import expectedJson from "../resources/SAPBatchEventHubConsumer/expected.json";
import { when } from "jest-when";
import { getSAPData } from "../../src/shared/SAPAPIService";
import { GET_BATCH_URL } from "../../src/functions/SAPBatchEventHubConsumer";
import { ContainerClient } from "@azure/storage-blob";
import { ServiceBusClient } from "@azure/service-bus";

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

  it("...", async () => {
    const context = new InvocationContext({
      functionName: "SAPBatchEventHubConsumer",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    process.env.SAP_API_URL = "my-awesome-sap-api-url";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const batchId = testInput["data"]["Batch"];
    const materialNumber = testInput["data"]["Material"];
    const batchIdentifyingPlant = testInput["data"]["BatchIdentifyingPlant"];

    when(getSAPData)
      .calledWith(
        GET_BATCH_URL(materialNumber, batchId, batchIdentifyingPlant),
        context,
      )
      .mockResolvedValue(getBatchSAPAPIResponseMock);

    await EventHubConsumerHandler(testInput, context);

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedJson,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: batchId,
    });
  });
});
