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
import { getISOUOMTranslation } from "../shared/conversions-utils";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { channel } from "diagnostics_channel";
/* eslint-enable @typescript-eslint/no-unused-vars */

export async function SAPMaterialMasterServiceBusReceiverHandlerV2(
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
    "SAPMaterialMasterServiceBusReceiverHandlerV2",
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

  let materialNumber = E1MARAMData["MATNR"];
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

  await fetchProductMasterClassAssignments(
    materialNumber,
    productMaster,
    context,
  );

  // Please refer to https://api.sap.com/api/OP_API_CLFN_PRODUCT_SRV/schema for type definition
  const result = productMaster.d;
  // custom Gore fields suffixed with _WLG
  result["BaseUnitISOCode_WLG"] = baseUnitISO;

  await getServiceBusSender(
    process.env.MATERIAL_MASTER_V2_SERVICE_BUS_TOPIC_NAME,
  ).sendMessages({
    body: result,
    contentType: "application/json",
    correlationId: correlationId,
    sessionId: materialNumber,
  });
  context.log(
    "Sent message to",
    process.env.MATERIAL_MASTER_V2_SERVICE_BUS_TOPIC_NAME,
    logMetadata,
  );
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
  }

  const promises = productMaster.d.to_ProductClass.results.map(
    async (classAssignment) => {
      const classCharacteristics = classAssignment.to_Characteristics.results;
      await Promise.all(
        classCharacteristics.map(async (characteristic) => {
          const description = await getCharacteristicDetails(
            characteristic.CharcInternalID,
            context,
          );
          // custom Gore fields suffixed with _WLG
          characteristic["to_Description_WLG"] = description;
          return characteristic;
        }),
      );
    },
  );
  await Promise.all(promises);
}

app.serviceBusTopic("SAPMaterialMasterServiceBusReceiverV2", {
  connection: "MesServiceBusConnection",
  topicName: "%IDOC_MATERIAL_MASTER_SERVICE_BUS_TOPIC_NAME%",
  subscriptionName: "%SERVICE_BUS_IDOC_MATERIAL_MASTER_TOPIC_V2_SUBSCRIPTION%",
  handler: SAPMaterialMasterServiceBusReceiverHandlerV2,
  cardinality: "one",
});
