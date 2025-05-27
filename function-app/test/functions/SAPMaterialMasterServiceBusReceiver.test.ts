import { SAPMaterialMasterServiceBusReceiverHandler } from "../../src/functions/SAPMaterialMasterServiceBusReceiver";
import { InvocationContext } from "@azure/functions";
import * as fs from "fs";
import getProductMasterSinglePlantSAPAPIResponseMock from "../resources/SAPMaterialMasterServiceBusReceiver/sap-api-get-product-master-single-plant-mock.json";
import getProductMasterMultiplePlantsSAPAPIResponseMock from "../resources/SAPMaterialMasterServiceBusReceiver/sap-api-get-product-master-multiple-plants-mock.json";
import getProductMasterNoPlantSAPAPIResponseMock from "../resources/SAPMaterialMasterServiceBusReceiver/sap-api-get-product-master-no-plant-data-mock.json";
import getProductMasterLongNumberSAPAPIResponseMock from "../resources/SAPMaterialMasterServiceBusReceiver/sap-api-get-product-master-material-number-long-mock.json";
import getCharacteristicDescriptionSAPAPIResponseMock from "../resources/SAPMaterialMasterServiceBusReceiver/sap-api-get-characteristic-description-mock.json";
import getProductMasterMultiplePlantsWithoutAssignmentsSAPAPIResponseMock from "../resources/SAPMaterialMasterServiceBusReceiver/sap-api-get-product-master-multiple-plants-without-assignments-mock.json";
import expectedSinglePlantJSON from "../resources/SAPMaterialMasterServiceBusReceiver/expected-single-plant.json";
import expectedMultiplePlantsJSON from "../resources/SAPMaterialMasterServiceBusReceiver/expected-multiple-plants.json";
import expectedMultiplePlantsEmptyClassAssignmentsJSON from "../resources/SAPMaterialMasterServiceBusReceiver/expected-multiple-plants-no-class-assignments.json";
import expectedMaterialNumberLongJSON from "../resources/SAPMaterialMasterServiceBusReceiver/expected-material-number-long.json";
import expectedNoPlantDataJSON from "../resources/SAPMaterialMasterServiceBusReceiver/expected-no-plant-data.json";
import {
  getCharacteristicDetails,
  getProductMaster,
} from "../../src/shared/SAPAPIService";
import { when } from "jest-when";
import { ContainerClient } from "@azure/storage-blob";
import { ServiceBusClient } from "@azure/service-bus";
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
  getProductMaster: jest.fn(),
  getCharacteristicDetails: jest.fn(),
}));

describe("SAP Material Master Service Bus Receiver Test", () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully build Material Master message with a single plant", async () => {
    const context = new InvocationContext({
      functionName: "SAPMaterialMasterServiceBusReceiver",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    // set environment variables
    process.env.SAP_API_URL = "https://my-awesome-sap-api-url.com";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const materialNumber = "VE0020GMC";
    const charcInternalD = "1241";

    when(getProductMaster)
      .calledWith(materialNumber, context)
      .mockResolvedValue(
        getProductMasterSinglePlantSAPAPIResponseMock as unknown as ProductMasterResponse,
      );

    when(getCharacteristicDetails)
      .calledWith(charcInternalD, context)
      .mockResolvedValue(
        getCharacteristicDescriptionSAPAPIResponseMock.d as unknown as A_ProductDescriptionType,
      );

    const xmlFile = fs.readFileSync(
      __dirname +
        "/../resources/SAPMaterialMasterServiceBusReceiver/input-single-plant.xml",
      "utf8",
    );

    // Invoke the handler
    await SAPMaterialMasterServiceBusReceiverHandler(xmlFile, context);
    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedSinglePlantJSON,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: materialNumber,
    });
  });

  it("should successfully build Material Master message with a multiple plants", async () => {
    const context = new InvocationContext({
      functionName: "SAPMaterialMasterServiceBusReceiver",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    // set environment variables
    process.env.SAP_API_URL = "https://my-awesome-sap-api-url.com";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const materialNumber = "VE2021";
    const charcInternalD = "1241";

    when(getProductMaster)
      .calledWith(materialNumber, context)
      .mockResolvedValue(
        getProductMasterMultiplePlantsSAPAPIResponseMock as unknown as ProductMasterResponse,
      );

    when(getCharacteristicDetails)
      .calledWith(charcInternalD, context)
      .mockResolvedValue(
        getCharacteristicDescriptionSAPAPIResponseMock.d as unknown as A_ProductDescriptionType,
      );

    const xmlFile = fs.readFileSync(
      __dirname +
        "/../resources/SAPMaterialMasterServiceBusReceiver/input-multiple-plants.xml",
      "utf8",
    );

    // Invoke the handler
    await SAPMaterialMasterServiceBusReceiverHandler(xmlFile, context);

    // Assert the message was sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedMultiplePlantsJSON,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: materialNumber,
    });
  });

  it("should skip Material Master message with a multiple plants and no class assignments", async () => {
    const context = new InvocationContext({
      functionName: "SAPMaterialMasterServiceBusReceiver",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    // set environment variables
    process.env.SAP_API_URL = "https://my-awesome-sap-api-url.com";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const materialNumber = "VE2021";

    when(getProductMaster)
      .calledWith(materialNumber, context)
      .mockResolvedValue(
        getProductMasterMultiplePlantsWithoutAssignmentsSAPAPIResponseMock as unknown as ProductMasterResponse,
      );

    const xmlFile = fs.readFileSync(
      __dirname +
        "/../resources/SAPMaterialMasterServiceBusReceiver/input-multiple-plants.xml",
      "utf8",
    );

    // Invoke the handler
    await SAPMaterialMasterServiceBusReceiverHandler(xmlFile, context);

    // Assert the message was  sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedMultiplePlantsEmptyClassAssignmentsJSON,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: materialNumber,
    });
  });

  it("should use MATNR_LONG as Material Number because MATNR is empty", async () => {
    const context = new InvocationContext({
      functionName: "SAPMaterialMasterServiceBusReceiver",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    // set environment variables
    process.env.SAP_API_URL = "https://my-awesome-sap-api-url.com";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const materialNumber = "KINGSPOOL BLACK LGE";
    const charcInternalD = "1241";

    when(getProductMaster)
      .calledWith(materialNumber, context)
      .mockResolvedValue(
        getProductMasterLongNumberSAPAPIResponseMock as unknown as ProductMasterResponse,
      );

    when(getCharacteristicDetails)
      .calledWith(charcInternalD, context)
      .mockResolvedValue(
        getCharacteristicDescriptionSAPAPIResponseMock.d as unknown as A_ProductDescriptionType,
      );

    const xmlFile = fs.readFileSync(
      __dirname +
        "/../resources/SAPMaterialMasterServiceBusReceiver/input-material-number-long.xml",
      "utf8",
    );

    // Invoke the handler
    await SAPMaterialMasterServiceBusReceiverHandler(xmlFile, context);

    // Assert the message was  sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedMaterialNumberLongJSON,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: materialNumber,
    });
  });

  it("should not skip empty Plant Data", async () => {
    const context = new InvocationContext({
      functionName: "SAPMaterialMasterServiceBusReceiver",
      triggerMetadata: {
        messageId: "test-message-id",
        correlationId: "test-correlation-id",
        SAP_MplCorrelationId: "test-correlation-id",
      },
    });

    // set environment variables
    process.env.SAP_API_URL = "https://my-awesome-sap-api-url.com";
    process.env.SAP_API_KEY = "my-awesome-sap-api-key";

    const materialNumber = "VE0020GMC";
    const charcInternalD = "1241";

    when(getProductMaster)
      .calledWith(materialNumber, context)
      .mockResolvedValue(
        getProductMasterNoPlantSAPAPIResponseMock as unknown as ProductMasterResponse,
      );

    when(getCharacteristicDetails)
      .calledWith(charcInternalD, context)
      .mockResolvedValue(
        getCharacteristicDescriptionSAPAPIResponseMock.d as unknown as A_ProductDescriptionType,
      );

    const xmlFile = fs.readFileSync(
      __dirname +
        "/../resources/SAPMaterialMasterServiceBusReceiver/input-no-plant-data.xml",
      "utf8",
    );

    // Invoke the handler
    await SAPMaterialMasterServiceBusReceiverHandler(xmlFile, context);

    // Assert the message was  sent to the Service Bus
    expect(sendMessagesMockFn).toHaveBeenCalledWith({
      body: expectedNoPlantDataJSON,
      contentType: "application/json",
      correlationId: "test-correlation-id",
      sessionId: materialNumber,
    });
  });
});
