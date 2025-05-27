import { app, InvocationContext } from "@azure/functions";
import {
  getCharacteristicDetails,
  getProductMaster,
} from "../shared/SAPAPIService";
import { XMLParser } from "fast-xml-parser";
import {
  getCorrelationId,
  getServiceBusSender,
} from "../shared/service-bus-client";
import { getMessageArchiveClient } from "../shared/message-archive-client";
import {
  ProductMasterIDoc,
  ProductMasterResponse,
} from "../shared/SAPAPIService.d";
import { MaterialMasterV1 } from "./SAPMaterialMasterServiceBusReceiver.d";
import { getISOUOMTranslation } from "../shared/conversions-utils";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { channel } from "diagnostics_channel";
import { A_ProductClassType } from "../shared/API_CLFN_PRODUCT_SRV";
/* eslint-enable @typescript-eslint/no-unused-vars */

export async function SAPMaterialMasterServiceBusReceiverHandler(
  // not an array (unknown[]), because cardinality is "one"
  message: unknown,
  context: InvocationContext,
) {
  context.log("Received message:", message);

  // Additional fields to be logged with the message for tracking purposes
  const correlationId = getCorrelationId(context);
  const logMetadata: Record<string, unknown> = {
    correlationId: correlationId,
  };
  // Archive the incoming message
  const containerClient = getMessageArchiveClient(
    context,
    "SAPMaterialMasterServiceBusReceiverHandler",
  );
  await containerClient.upload(message, "input.xml", {
    blobHTTPHeaders: { blobContentType: "application/xml" },
    tags: { correlationid: correlationId },
  });
  context.info("Archived incoming message", logMetadata);

  const alwaysArray = [
    "ZMATMAS0601.IDOC.E1MARAM.E1MARCM",
    "ZMATMAS0601.IDOC.E1MARAM.E1MAKTM",
  ];
  const options = {
    ignoreAttributes: false,
    numberParseOptions: {
      leadingZeros: false,
      hex: false,
    },
    /* eslint-disable @typescript-eslint/no-unused-vars */
    isArray: (name, jpath, isLeafNode, isAttribute) => {
      /* eslint-enable @typescript-eslint/no-unused-vars */
      if (alwaysArray.indexOf(jpath) !== -1) return true;
    },
  };
  const parser = new XMLParser(options);
  const idocJSObj: ProductMasterIDoc = parser.parse(message.toString());
  const E1MARAMData = idocJSObj["ZMATMAS0601"]["IDOC"]["E1MARAM"];

  let materialNumber = E1MARAMData["MATNR"]; // TODO - ENSURE TEST CASE FOR UNKNOWNS TYPES
  if (!materialNumber) {
    context.warn(`MATNR not found in IDoc, using MATNR_LONG instead`);
    materialNumber = E1MARAMData["MATNR_LONG"];
  }

  // check that material number is not empty, or greater than 30 characters
  if (!materialNumber || materialNumber.length > 30) {
    const errorMessage = `Material number is invalid: ${materialNumber}`;
    context.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Enforce it to be a string to avoid issues with number-only material numbers
  materialNumber = `${materialNumber}`;
  const productMaster = await getProductMaster(materialNumber, context);
  const baseUnitISO = await getISOUOMTranslation(productMaster.d.BaseUnit);
  const plantDataList = fetchPlantData(productMaster);

  // Cleanup ProductDescription to comply with MaterialMasterV1 schema
  productMaster.d.to_Description.results.forEach((description) => {
    delete description.__metadata;
    delete description.Product;
  });

  const classAssignmentsList = await fetchProductMasterClassAssignments(
    materialNumber,
    productMaster,
    context,
  );

  const result: MaterialMasterV1 = {
    Product: materialNumber, // IDoc MATNR
    BaseUnit: productMaster.d.BaseUnit,
    BaseUnitISOCode: baseUnitISO,
    ProductDescription: productMaster.d.to_Description.results,
    PlantData: plantDataList,
    ProductClass: classAssignmentsList,
  };

  await getServiceBusSender(
    process.env.MATERIAL_MASTER_V1_SERVICE_BUS_TOPIC_NAME,
  ).sendMessages({
    body: result,
    contentType: "application/json",
    correlationId: correlationId,
    sessionId: materialNumber,
  });
  context.log(
    "Sent message to",
    process.env.MATERIAL_MASTER_V1_SERVICE_BUS_TOPIC_NAME,
    logMetadata,
  );

  context.log("Result:", JSON.stringify(result));

  // Send the message to the archive
  await containerClient.upload(result, `output.json`, {
    blobHTTPHeaders: { blobContentType: "application/json" },
    tags: { correlationid: `${context.triggerMetadata.correlationId}` },
  });
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

/**
 * @returns Plant data in the format required by the Material Master V1 schema
 */
function fetchPlantData(productMaster: ProductMasterResponse) {
  return productMaster.d.to_Plant.results.map((plantInfo) => {
    return {
      CountryOfOrigin:
        plantInfo.CountryOfOrigin === "" ? null : plantInfo.CountryOfOrigin,
      GoodsReceiptDuration: plantInfo.GoodsReceiptDuration,
      Plant: plantInfo.Plant === "" ? null : plantInfo.Plant,
      ProcurementType: plantInfo.ProcurementType,
      ProfileCode: plantInfo.ProfileCode,
    };
  });
}

app.serviceBusTopic("SAPMaterialMasterServiceBusReceiver", {
  connection: "MesServiceBusConnection",
  topicName: "%IDOC_MATERIAL_MASTER_SERVICE_BUS_TOPIC_NAME%",
  subscriptionName: "%SERVICE_BUS_IDOC_MATERIAL_MASTER_TOPIC_SUBSCRIPTION%",
  handler: SAPMaterialMasterServiceBusReceiverHandler,
  cardinality: "one",
});
