import { EventHubConsumerHandler } from "../../src/functions/SAPProductionOrderEventHubConsumer";
import { InvocationContext } from "@azure/functions";
import testInput from "../resources/SAPProductionOrderEventHubConsumer/input.json";
import expectedJson from "../resources/SAPProductionOrderEventHubConsumer/expected.json";
import expectedJsonStale from "../resources/SAPProductionOrderEventHubConsumer/stale-expected.json";
import { when } from "jest-when";
import { getSAPData } from "../../src/shared/SAPAPIService";
import productionOrderSAPAPIResponseMock from "../../test/resources/SAPProductionOrderEventHubConsumer/sap-api-get-production-order-mock.json";
import productionOrderSAPAPIResponseStaleMock from "../../test/resources/SAPProductionOrderEventHubConsumer/sap-api-get-production-order-stale-mock.json";
import { GET_PRODUCTION_ORDER_URL } from "../../src/functions/SAPProductionOrderEventHubConsumer";
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

describe("SAP Production Order Event Hub Consumer Test", () => {
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
  it("should successfully enrich incoming Production Order message.", async () => {
    const context = new InvocationContext({
      functionName: "SAPProductionOrderEventHubConsumer",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    const productionOrderId = testInput["data"]["ManufacturingOrder"];

    when(getSAPData)
      .calledWith(GET_PRODUCTION_ORDER_URL(productionOrderId), context)
      .mockResolvedValue(productionOrderSAPAPIResponseMock);

    await EventHubConsumerHandler(testInput, context);

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedJson,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: productionOrderId,
    });
  });

  it("should successfully enrich incoming Production Order message and print a warning that data could be stale.", async () => {
    const context = new InvocationContext({
      functionName: "SAPProductionOrderEventHubConsumer",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });
    const productionOrderId = testInput["data"]["ManufacturingOrder"];

    when(getSAPData)
      .calledWith(GET_PRODUCTION_ORDER_URL(productionOrderId), context)
      .mockResolvedValue(productionOrderSAPAPIResponseStaleMock);
    const logSpy = jest.spyOn(context, "warn");

    await EventHubConsumerHandler(testInput, context);

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedJsonStale,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: productionOrderId,
    });
    expect(logSpy).toHaveBeenCalledWith(
      `Production Order ${productionOrderId} data could be stale, tried pulling updated data 3 times.`,
    );
  });

  it("should successfully enrich incoming Production Order message and not print the stale data warning because second call returned updated data.", async () => {
    const context = new InvocationContext({
      functionName: "SAPProductionOrderEventHubConsumer",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });
    const productionOrderId = testInput["data"]["ManufacturingOrder"];

    when(getSAPData)
      .calledWith(GET_PRODUCTION_ORDER_URL(productionOrderId), context)
      .mockResolvedValueOnce(productionOrderSAPAPIResponseStaleMock)
      .mockResolvedValueOnce(productionOrderSAPAPIResponseMock);
    const logSpy = jest.spyOn(context, "warn");

    await EventHubConsumerHandler(testInput, context);

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedJson,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: productionOrderId,
    });
    expect(logSpy).not.toHaveBeenCalled();
  });
});
