import { EventHubConsumerHandler } from "../../src/functions/SAPInventoryLocationMoveEventHubConsumer";
import { InvocationContext } from "@azure/functions";
import testInput from "../resources/SAPInventoryLocationMoveEventHubConsumer/input.json";
import expectedJson from "../resources/SAPInventoryLocationMoveEventHubConsumer/expected.json";
import testQuantityZeroInput from "../resources/SAPInventoryLocationMoveEventHubConsumer/input-quantity-zero.json";
import testEmptyBatchInput from "../resources/SAPInventoryLocationMoveEventHubConsumer/input-empty-batch.json";
import expectedQuantityZeroJson from "../resources/SAPInventoryLocationMoveEventHubConsumer/expected-quantity-zero.json";
import expectedEmptyBatchJson from "../resources/SAPInventoryLocationMoveEventHubConsumer/expected-empty-batch.json";
import {
  getProductMaster,
  getSAPData,
  getCharacteristicDetails,
} from "../../src/shared/SAPAPIService";
import { ContainerClient } from "@azure/storage-blob";
import { ServiceBusClient } from "@azure/service-bus";
import { when } from "jest-when";
import {
  GET_WAREHOUSE_AVAILABLE_STOCK_URL,
  GET_BATCH_URL,
} from "../../src/functions/SAPInventoryLocationMoveEventHubConsumer";
import getWarehouseApiResponseMock from "../resources/SAPInventoryLocationMoveEventHubConsumer/sap-api-get-warehouse-mock.json";
import getWarehouseQuantityZeroApiResponseMock from "../resources/SAPInventoryLocationMoveEventHubConsumer/sap-api-get-warehouse-quantity-zero-mock.json";
import getWarehouseEmptyBatchApiResponseMock from "../resources/SAPInventoryLocationMoveEventHubConsumer/sap-api-get-warehouse-empty-batch-mock.json";
import getProductMasterSuccessWithValuationsMockResponse from "../resources/SAPInventoryLocationMoveEventHubConsumer/sap-api-get-product-master-success-with-valuations.json";
import getProductMasterWithEmptyValuationsMockResponse from "../resources/SAPInventoryLocationMoveEventHubConsumer/sap-api-get-product-master-success-with-empty-valuations.json";
import getProductMasterWithZeroQuantityMockResponse from "../resources/SAPInventoryLocationMoveEventHubConsumer/sap-api-get-product-master-success-with-zero-quantity.json";
import getProductMasterSuccessWithEmptyBatchMockResponse from "../resources/SAPInventoryLocationMoveEventHubConsumer/sap-api-get-product-master-success-with-empty-batch.json";
import getCharacteristicDescriptionSAPAPIResponseMock from "../resources/SAPInventoryLocationMoveEventHubConsumer/sap-api-get-characteristic-description-mock.json";
import getBatchApiResponseMock from "../resources/SAPInventoryLocationMoveEventHubConsumer/sap-api-get-batch-mock.json";
import { ProductMasterResponse } from "../../src/shared/SAPAPIService.d";
import { A_ProductDescriptionType } from "../../src/shared/API_CLFN_PRODUCT_SRV";

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
  getProductClassAssignments: jest.fn(),
  getProductMaster: jest.fn(),
  getCharacteristicDetails: jest.fn(),
}));

describe("SAP Inventory Location Move Event Hub Consumer Test", () => {
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

  it("Success with Valuations", async () => {
    const context = new InvocationContext({
      functionName: "SAPInventoryLocationMoveEventHubConsumer",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    process.env.SAP_API_URL = "my-awesome-sap-api-url";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const warehouse = testInput.data.EWMWarehouse;
    const storageType = testInput.data.EWMStorageType;
    const material = testInput.data.Product;
    const batch = testInput.data.Batch;
    const charcInternalD = "1241";
    const batchIdentifyingPlant = "";
    // const charcInternalID = "810";

    when(getSAPData)
      .calledWith(
        GET_WAREHOUSE_AVAILABLE_STOCK_URL(
          warehouse,
          storageType,
          material,
          batch,
        ),
        context,
      )
      .mockResolvedValue(getWarehouseApiResponseMock);

    when(getProductMaster)
      .calledWith(material, context)
      .mockResolvedValue(
        getProductMasterSuccessWithValuationsMockResponse as unknown as ProductMasterResponse,
      );

    when(getCharacteristicDetails)
      .calledWith(charcInternalD, context)
      .mockResolvedValue(
        getCharacteristicDescriptionSAPAPIResponseMock.d as unknown as A_ProductDescriptionType,
      );

    when(getSAPData)
      .calledWith(
        GET_BATCH_URL(material, batch, batchIdentifyingPlant),
        context,
      )
      .mockResolvedValue(getBatchApiResponseMock);

    await EventHubConsumerHandler(testInput, context);

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedJson,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: `${material}-${batch}`,
    });
  });

  it("Success with empty Valuations", async () => {
    const context = new InvocationContext({
      functionName: "SAPInventoryLocationMoveEventHubConsumer",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    process.env.SAP_API_URL = "my-awesome-sap-api-url";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const warehouse = testInput.data.EWMWarehouse;
    const storageType = testInput.data.EWMStorageType;
    const material = testInput.data.Product;
    const batch = testInput.data.Batch;
    const charcInternalD = "1241";

    when(getSAPData)
      .calledWith(
        GET_WAREHOUSE_AVAILABLE_STOCK_URL(
          warehouse,
          storageType,
          material,
          batch,
        ),
        context,
      )
      .mockResolvedValue(getWarehouseApiResponseMock);

    when(getProductMaster)
      .calledWith(material, context)
      .mockResolvedValue(
        getProductMasterWithEmptyValuationsMockResponse as unknown as ProductMasterResponse,
      );

    when(getCharacteristicDetails)
      .calledWith(charcInternalD, context)
      .mockResolvedValue(
        getCharacteristicDescriptionSAPAPIResponseMock.d as unknown as A_ProductDescriptionType,
      );

    await EventHubConsumerHandler(testInput, context);

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      // TODO This expected payload does have valuations, contrary to the test name?
      body: expectedJson,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: `${material}-${batch}`,
    });
  });

  it("Success with Quantity Zero", async () => {
    const context = new InvocationContext({
      functionName: "SAPInventoryLocationMoveEventHubConsumer",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    process.env.SAP_API_URL = "my-awesome-sap-api-url";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const warehouse = testQuantityZeroInput.data.EWMWarehouse;
    const storageType = testQuantityZeroInput.data.EWMStorageType;
    const material = testQuantityZeroInput.data.Product;
    const batch = testQuantityZeroInput.data.Batch;
    const charcInternalD = "1241";
    const batchIdentifyingPlant = "";

    when(getSAPData)
      .calledWith(
        GET_WAREHOUSE_AVAILABLE_STOCK_URL(
          warehouse,
          storageType,
          material,
          batch,
        ),
        context,
      )
      .mockResolvedValue(getWarehouseQuantityZeroApiResponseMock);

    when(getSAPData)
      .calledWith(
        GET_BATCH_URL(material, batch, batchIdentifyingPlant),
        context,
      )
      .mockResolvedValue(getBatchApiResponseMock);

    when(getProductMaster)
      .calledWith(material, context)
      .mockResolvedValue(
        getProductMasterWithZeroQuantityMockResponse as unknown as ProductMasterResponse,
      );

    when(getCharacteristicDetails)
      .calledWith(charcInternalD, context)
      .mockResolvedValue(
        getCharacteristicDescriptionSAPAPIResponseMock.d as unknown as A_ProductDescriptionType,
      );

    await EventHubConsumerHandler(testQuantityZeroInput, context);

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedQuantityZeroJson,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: `VE0020GMC-${batch}`,
    });
  });

  it("Success with Empty Batch", async () => {
    const context = new InvocationContext({
      functionName: "SAPInventoryLocationMoveEventHubConsumer",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    process.env.SAP_API_URL = "my-awesome-sap-api-url";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const warehouse = testEmptyBatchInput.data.EWMWarehouse;
    const storageType = testEmptyBatchInput.data.EWMStorageType;
    const material = testEmptyBatchInput.data.Product;
    const batch = testEmptyBatchInput.data.Batch;
    const charcInternalD = "1241";

    when(getSAPData)
      .calledWith(
        GET_WAREHOUSE_AVAILABLE_STOCK_URL(
          warehouse,
          storageType,
          material,
          batch,
        ),
        context,
      )
      .mockResolvedValue(getWarehouseEmptyBatchApiResponseMock);

    when(getProductMaster)
      .calledWith(material, context)
      .mockResolvedValue(
        getProductMasterSuccessWithEmptyBatchMockResponse as unknown as ProductMasterResponse,
      );

    when(getCharacteristicDetails)
      .calledWith(charcInternalD, context)
      .mockResolvedValue(
        getCharacteristicDescriptionSAPAPIResponseMock.d as unknown as A_ProductDescriptionType,
      );

    await EventHubConsumerHandler(testEmptyBatchInput, context);

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedEmptyBatchJson,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: `${material}-`,
    });
  });
});
