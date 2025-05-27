import { EventHubConsumerHandler } from "../../src/functions/SAPInspectionLotEventHubConsumer";
import { InvocationContext } from "@azure/functions";
import testInput from "../resources/SAPInspectionLotEventHubConsumer/input.json";
import expectedJson from "../resources/SAPInspectionLotEventHubConsumer/expected.json";
import getInspectionLotApiResponseMock from "../resources/SAPInspectionLotEventHubConsumer/sap-api-get-inspection-lot-mock.json";
import getBatchApiResponseMock from "../resources/SAPInspectionLotEventHubConsumer/sap-api-get-batch-mock.json";
import getCharacteristicDescriptionApiResponseMock from "../resources/SAPInspectionLotEventHubConsumer/sap-api-get-charateristic-description-mock.json";
import getCharacteristicValueApiResponseMock from "../resources/SAPInspectionLotEventHubConsumer/sap-api-get-characteristic-value-mock.json";
import { getSAPData } from "../../src/shared/SAPAPIService";
import {
  GET_INSPECTION_LOT_URL,
  GET_BATCH_URL,
  GET_CHARACTERISTIC_DESCRIPTION_URL,
  GET_CHARACTERISTIC_VALUE_URL,
} from "../../src/functions/SAPInspectionLotEventHubConsumer";
import { ContainerClient } from "@azure/storage-blob";
import { ServiceBusClient } from "@azure/service-bus";
import { when } from "jest-when";

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

describe("SAP Inspection Lot Event Hub Consumer Test", () => {
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
      functionName: "SAPInspectionLotEventHubConsumer",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    process.env.SAP_API_URL = "my-awesome-sap-api-url";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const inspectionLotId = testInput.data.InspectionLot;
    const materialNumber = "VE0020GMC";
    const batch = "0000004352";
    const batchIdentifyingPlant = "";
    const charcInternalID = "810";

    when(getSAPData)
      .calledWith(GET_INSPECTION_LOT_URL(inspectionLotId), context)
      .mockResolvedValue(getInspectionLotApiResponseMock);

    when(getSAPData)
      .calledWith(
        GET_BATCH_URL(materialNumber, batch, batchIdentifyingPlant),
        context,
      )
      .mockResolvedValue(getBatchApiResponseMock);

    when(getSAPData)
      .calledWith(GET_CHARACTERISTIC_DESCRIPTION_URL(charcInternalID), context)
      .mockResolvedValue(getCharacteristicDescriptionApiResponseMock);

    when(getSAPData)
      .calledWith(
        GET_CHARACTERISTIC_VALUE_URL(
          materialNumber,
          batchIdentifyingPlant,
          batch,
          charcInternalID,
        ),
        context,
      )
      .mockResolvedValue(getCharacteristicValueApiResponseMock);

    await EventHubConsumerHandler(testInput, context);

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedJson,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: batch,
    });
  });
});
