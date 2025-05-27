// Storage Account, e.g. to store the Function's code

param location string
param functionAppIdentityName string
param coaPrincipalId string

output name string = storageAccount.name

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts?pivots=deployment-language-bicep
@description('The storage account containing the Azure Function code, queues, blobs, etc. used by the function app')
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'sa${uniqueString(resourceGroup().id)}'
  location: location
  tags: resourceGroup().tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    defaultToOAuthAuthentication: true
  }
}

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts/blobservices?pivots=deployment-language-bicep
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {}
}

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts/blobservices/containers?pivots=deployment-language-bicep
resource messageArchive 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'message-archive'
  properties: {
    publicAccess: 'None'
  }
}

@description('Identity of the Function App')
resource functionAppIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: functionAppIdentityName
}

// https://learn.microsoft.com/azure/role-based-access-control/built-in-roles#storage-blob-data-owner
var storageBlobDataOwnerRole = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
)

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.authorization/roleassignments?pivots=deployment-language-bicep
resource functionAppStorageOwnerRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, functionAppIdentity.id, storageBlobDataOwnerRole)
  scope: storageAccount
  properties: {
    description: 'Assigns the Function App the Storage Blob Data Owner role on ${storageAccount.name}'
    principalId: functionAppIdentity.properties.principalId
    roleDefinitionId: storageBlobDataOwnerRole
  }
}

// https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage#storage-blob-data-reader
var storageBlobDataReaderRole = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
)

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.authorization/roleassignments?pivots=deployment-language-bicep
resource coaStorageReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, storageAccount.id, coaPrincipalId, storageBlobDataReaderRole)
  scope: storageAccount
  properties: {
    description: 'Assigns the COA App the Storage Blob Data Reader role on ${storageAccount.name}'
    principalId: coaPrincipalId
    roleDefinitionId: storageBlobDataReaderRole
  }
}
