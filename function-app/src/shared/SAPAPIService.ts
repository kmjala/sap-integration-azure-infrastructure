import { InvocationContext } from "@azure/functions";
// Retry fetch requests, see https://www.npmjs.com/package/fetch-retry
import fetchRetry from "fetch-retry";
import { ProductMasterResponse } from "./SAPAPIService.d";
import { A_ProductDescriptionType } from "./API_CLFN_PRODUCT_SRV";

export const GET_CHARACTERISTIC_DESCRIPTION_URL = (charcInternalD) =>
  `${process.env.SAP_API_URL}/classificationcharacteristic/v1/A_ClfnCharcDescForKeyDate(CharcInternalID='${encodeURIComponent(charcInternalD)}',Language='EN')`;

export async function getSAPData(
  sapApiUrl: string,
  context: InvocationContext,
  /* eslint-disable @typescript-eslint/no-explicit-any */
): Promise<any> {
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // TODO Remove, once the API Proxies have been fixed in S4Q
  const shouldUseV2URL = Boolean(
    JSON.parse(process.env.SAP_API_USE_V2_URL ?? "false"),
  );
  if (shouldUseV2URL) {
    context.warn(
      "Using v2 URL for SAP API calls. This should be removed once the API Proxies have been fixed in S4Q.",
    );
    sapApiUrl = sapApiUrl.replace("/v1/", "/v2/");
  }

  try {
    context.log(`Calling SAP API: ${sapApiUrl}`);
    // Retry configuration
    const fetchWithRetry = fetchRetry(global.fetch, {
      retries: 3,
      retryOn: async (attempt, error, response) => {
        // Do not retry if we already tried it often enough
        if (attempt >= 3) {
          return false;
        }
        // Do not retry if there was no network error and success status codes
        else if (!error && response?.status < 400) {
          return false;
        }

        // Print a warning message and retry
        if (response) {
          const responseText = await response.text();
          context.warn(
            `Call (attempt ${attempt + 1}) to SAP API ${sapApiUrl} failed with response status (${response.status}): ${responseText}`,
          );
        } else {
          context.warn(
            `Call (attempt ${attempt + 1}) to SAP API ${sapApiUrl} failed due to a network error: ${error.stack ?? error}`,
          );
        }

        return true;
      },
      retryDelay: (attempt) => {
        context.warn(`Call to API ${sapApiUrl} failed, retrying...`);
        return Math.pow(2, attempt) * 500;
      },
    });
    const response = await fetchWithRetry(sapApiUrl, {
      method: "GET",
      headers: {
        APIKey: process.env.SAP_API_KEY,
        "Accept-Encoding": "gzip,deflate",
        Accept: "application/json",
      },
    });
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `Failed to call SAP API ${sapApiUrl} with response status (${response.status}): ${responseText}`,
      );
    }
    return JSON.parse(responseText);
  } catch (error) {
    context.error(
      `Error calling SAP API ${sapApiUrl}: ${error.stack ?? error}`,
    );
    throw error;
  }
}

export async function getProductMaster(
  materialNumber: string,
  context: InvocationContext,
): Promise<ProductMasterResponse> {
  try {
    // Use load-balanced API if specified in the environment variable
    const basePath = shouldUseLoadBalancedAPI()
      ? "materialclassification-lb/v1"
      : "materialclassification/v1";

    // Return the response from the SAP API
    const expandedFields = [
      "to_Plant",
      "to_Description",
      "to_ProductClass",
      "to_ProductClass/to_Characteristics",
      "to_ProductClass/to_Characteristics/to_Valuation",
      "to_ProductClass/to_ClassDetails",
    ].join(",");
    const url = `${process.env.SAP_API_URL}/${basePath}/A_ClfnProduct('${encodeURIComponent(materialNumber)}')?$expand=${expandedFields}`;
    return await getSAPData(url, context);
  } catch (error) {
    throw new Error(
      `Error retrieving Production Master Data using SAP API: ${error.stack ?? error}`,
    );
  }
}

// TODO Remove, once the load-balancer has been finalised
function shouldUseLoadBalancedAPI(): boolean {
  return Boolean(JSON.parse(process.env.SAP_API_USE_LB ?? "false"));
}

/**
 * Cache for characteristic descriptions to avoid redundant API calls. Since
 * descriptions rarely change, they can be cached for the duration of the
 * Function App instance lifetime, given how short it is.
 */
const cachedDescriptions = new Map<string, A_ProductDescriptionType>();

/**
 * @returns Description of a characteristic
 */
export async function getCharacteristicDetails(
  characteristicInternalID: string,
  context: InvocationContext,
) {
  // Update the cache if the description has not been retrieved yet
  if (!cachedDescriptions.has(characteristicInternalID)) {
    const characteristicDescription = await getSAPData(
      GET_CHARACTERISTIC_DESCRIPTION_URL(characteristicInternalID),
      context,
    );

    cachedDescriptions.set(
      characteristicInternalID,
      characteristicDescription.d,
    );
  }

  return cachedDescriptions.get(characteristicInternalID);
}
