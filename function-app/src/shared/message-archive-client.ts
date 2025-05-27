/**
 * This file contains code used by all Functions to upload files to the
 * "message-archive" blob container.
 */

import { BlockBlobUploadOptions, ContainerClient } from "@azure/storage-blob";
import {
  DefaultAzureCredential,
  ManagedIdentityCredential,
} from "@azure/identity";
import { InvocationContext } from "@azure/functions";

export type MyContainerClient = {
  /**
   * Uploads a message to the "message-archive" blob container with a prefix
   * to group all messages from the same trigger invocation together.
   *
   * @returns full name of the blob that was uploaded, i.e. ${prefix}/${name}
   */
  upload: (
    blob: unknown,
    name: string,
    blockUploadOptions?: BlockBlobUploadOptions,
  ) => Promise<string>;
};

/**
 * @param context Invocation context of the Function, used to determine the folder path for the blob
 * @param topic Name of the topic the message was received from, used to determine the folder path for the blob
 * @returns ContainerClient for the "message-archive" blob container
 */
export function getMessageArchiveClient(
  context: InvocationContext,
  topic: string,
): MyContainerClient {
  // The credentials to authenticate with Azure Storage are determined by the
  // environment variables. If the environment variable FUNCTIONAPPIDENTITY_CLIENTID
  // is set, then the Function App is running in Azure and the managed identity
  // is used. Otherwise, it is running locally by a developer and the developer's
  // credentials are used (requiring them to az login before running it locally).
  const credential = process.env.FUNCTIONAPPIDENTITY_CLIENTID
    ? new ManagedIdentityCredential({
        clientId: process.env.FUNCTIONAPPIDENTITY_CLIENTID,
      })
    : new DefaultAzureCredential();

  // Container client has to be created here inside the function, as mocking in
  // the tests otherwise does not work.
  const containerClient = new ContainerClient(
    `${process.env.MESSAGE_ARCHIVE_BLOB_SERVICE_URI}/message-archive`,
    credential,
  );

  const blobPrefix = createBlobNamePrefix(context, topic);
  return {
    upload: async (
      blob: unknown,
      name: string,
      blockUploadOptions?: BlockBlobUploadOptions,
    ) => {
      const blobName = `${blobPrefix}/${name}`;
      const body = toString(blob);
      await containerClient
        .getBlockBlobClient(blobName)
        .upload(body, body.length, blockUploadOptions);

      return blobName;
    },
  };
}

export function createBlobNamePrefix(
  context: InvocationContext,
  topic: string,
  // Date required as parameter for unit test purposes
  date: Date = new Date(),
): string {
  let blobPrefix = `topic=${topic}`;
  blobPrefix += `/year=${date.getUTCFullYear()}`;
  const month = date.getUTCMonth() + 1;
  blobPrefix += `/month=${month < 10 ? `0${month}` : month}`;
  const day = date.getUTCDate();
  blobPrefix += `/day=${day < 10 ? `0${day}` : day}`;
  const id = context.triggerMetadata?.messageId
    ? context.triggerMetadata?.messageId
    : context.invocationId;
  blobPrefix += `/mid=${id}`;

  return blobPrefix;
}

/**
 * @returns message as string
 */
function toString(message: unknown): string {
  if (typeof message === "string") {
    return message;
  }

  try {
    if (typeof message === "object") {
      return JSON.stringify(message);
    }

    return String(message);
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new Error(`Error converting message to string: ${err.message}`);
    }
    throw new Error(`Failed converting message to string: ${err}`);
  }
}

export async function archiveMessage(
  message: unknown,
  name: string,
  context: InvocationContext,
  containerClient: MyContainerClient,
): Promise<string> {
  const blockUploadOptions = {
    tags: getBlobTags(context),
  } as BlockBlobUploadOptions;

  // Derive the content-type from the two expected file extensions
  if (name.endsWith(".json")) {
    blockUploadOptions.blobHTTPHeaders = {
      blobContentType: "application/json",
    };
  } else if (name.endsWith(".xml")) {
    blockUploadOptions.blobHTTPHeaders = {
      blobContentType: "application/xml",
    };
  }

  const blobName = await containerClient.upload(
    message,
    name,
    blockUploadOptions,
  );

  const subscription = encodeURIComponent(process.env.AZURE_SUBSCRIPTION_ID);
  const resourceGroup = encodeURIComponent(
    process.env.AZURE_RESOURCE_GROUP_NAME,
  );
  const storageAccount = encodeURIComponent(
    process.env.AzureWebJobsStorage__accountName,
  );
  const urlEncodedBlobName = encodeURIComponent(blobName);
  const browserLink = `https://portal.azure.com/#view/Microsoft_Azure_Storage/BlobPropertiesBladeV2/storageAccountId/%2Fsubscriptions%2F${subscription}%2FresourceGroups%2F${resourceGroup}%2Fproviders%2FMicrosoft.Storage%2FstorageAccounts%2F${storageAccount}/path/message-archive%2F${urlEncodedBlobName}/isDeleted~/false/tabToload~/0`;
  context.info(`Archived ${name} at ${browserLink}`);

  return blobName;
}

/**
 * Removes unrelevant Azure-specific attributes from the trace context, e.g. "az.namespace".
 *
 * @param attributes Trace attributes from the `InvocationContext`
 */
function getBlobTags(context: InvocationContext): Record<string, string> {
  const tags: Record<string, string> = {};
  const blacklist = ["az.", "component", "peer.", "message_bus.", "kind"];

  // Skip tags if no attributes are present
  if (!context.traceContext?.attributes) {
    return tags;
  }

  // Filter out all attributes that are not valid tags, see
  // https://learn.microsoft.com/en-us/azure/storage/blobs/storage-manage-find-blobs?tabs=azure-portal#setting-blob-index-tags
  for (const [key, value] of Object.entries(context.traceContext.attributes)) {
    // Tag values must be between zero and 256 characters
    if (!/^[a-zA-Z0-9 +\-.:=_/]{1,128}$/.test(key)) {
      context.warn("Invalid tag key:", key);
      continue;
    }

    // Tag values must be between zero and 256 characters
    if (!/^[a-zA-Z0-9 +\-.:=_/]{0,256}$/.test(value)) {
      context.warn("Invalid tag value:", value);
      continue;
    }

    // Remove all elements that start with a blacklisted prefix
    if (blacklist.some((prefix) => key.startsWith(prefix))) {
      continue;
    }

    // Limit the number of tags to 10, since Azure blobs may only have 10 tags
    if (Object.keys(tags).length < 10) {
      tags[key] = value;
    } else {
      context.warn(
        `Exceeded maximum of 10 tags allowed, dropping '${key}: ${value}'`,
      );
    }
  }

  // Return a new object from the filtered attributes
  return Object.fromEntries(Object.entries(tags));
}
