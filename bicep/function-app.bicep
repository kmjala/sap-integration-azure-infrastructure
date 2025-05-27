@description('Location of the Function App, must be one that supports flex consumption plan')
param location string = 'westus3'
param eventHubNamespace string
param serviceBusNamespaceName string
param managedIdentityName string
param applicationInsightsName string
// Material Master
param idocMaterialMasterServiceBusTopicName string
param azureFunctionIDocMaterialMasterTopicSubscriptionName string
param azureFunctionIDocMaterialMasterV2TopicSubscriptionName string
param materialMasterV1ServiceBusTopicName string
param materialMasterV2ServiceBusTopicName string
// Production Order
param productionOrderEventHubName string
param productionOrderEventHubConsumerGroupName string
param productionOrderServiceBusTopicName string
// Batch
param batchEventHubName string
param batchEventHubConsumerGroupName string
param batchServiceBusTopicName string
// Inventory Location Move
param inventoryLocationMoveEventHubName string
param inventoryLocationMoveEventHubConsumerGroupName string
param inventoryLocationMoveServiceBusTopicName string
// Inspection Lot
param inspectionLotEventHubName string
param inspectionLotEventHubConsumerGroupName string
param inspectionLotServiceBusTopicName string
// Delivery Information
param coaDeliveryEventHubName string
param coaDeliveryConsumerGroupName string
param coaIntegrationServiceBusTopicName string
// SAP API
param sapApiUrl string
param sapApiKey string
// Production Order Settings
param sapApiProdOrderLastChangeTimeThreshold string
param sapApiProdOrderRetryDelay string
param sapApiProdOrderMaxRetries string

param storageAccountName string

output functionAppName string = functionApp.name

@description('Identity of the Function App')
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: managedIdentityName
}

@description('The Application Insights instance used by the function app')
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: applicationInsightsName
}

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts?pivots=deployment-language-bicep
@description('The storage account containing the Azure Function code, queues, blobs, etc. used by the function app')
resource messageArchiveStorageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts?pivots=deployment-language-bicep
@description('The storage account containing the Azure Function code')
resource functionAppStorageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'sa${uniqueString(resourceGroup().id)}codefc'
  location: location
  tags: resourceGroup().tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    defaultToOAuthAuthentication: true
    allowBlobPublicAccess: false
  }

  resource blobServices 'blobServices' = {
    name: 'default'

    resource deploymentContainer 'containers' = {
      name: 'fa-${uniqueString(resourceGroup().id)}'
      properties: {
        publicAccess: 'None'
      }
    }
  }
}

// https://learn.microsoft.com/azure/role-based-access-control/built-in-roles#storage-blob-data-owner
var storageBlobDataOwnerRole = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
)

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.authorization/roleassignments?pivots=deployment-language-bicep
resource messageArchiveStorageOwnerRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, managedIdentity.id, storageBlobDataOwnerRole)
  scope: messageArchiveStorageAccount
  properties: {
    description: 'Assigns the Function App the Storage Blob Data Owner role on ${messageArchiveStorageAccount.name}'
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: storageBlobDataOwnerRole
  }
}

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.authorization/roleassignments?pivots=deployment-language-bicep
resource functionAppStorageOwnerRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, managedIdentity.id, storageBlobDataOwnerRole, functionAppStorageAccount.id)
  scope: functionAppStorageAccount
  properties: {
    description: 'Assigns the Function App the Storage Blob Data Owner role on ${functionAppStorageAccount.name}'
    principalId: functionApp.identity.principalId
    roleDefinitionId: storageBlobDataOwnerRole
  }
}

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.web/serverfarms?pivots=deployment-language-bicep
resource hostingPlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: 'hp-${uniqueString(resourceGroup().id)}-fc'
  location: location
  tags: resourceGroup().tags
  kind: 'functionapp'
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true
  }
}

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.web/sites?pivots=deployment-language-bicep
resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  // Using guid() to ensure the name is unique, even across environments
  name: 'fa-${uniqueString(resourceGroup().id)}-fc'
  location: location
  tags: resourceGroup().tags
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      // See https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings
      // Some appSettings are deprecated for FlexConsumption, see here: https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings#flex-consumption-plan-deprecations
      appSettings: [
        {
          // https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings#azurewebjobsstorage__accountname
          name: 'AzureWebJobsStorage__accountName'
          value: functionAppStorageAccount.name
        }
        {
          // https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings#appinsights_instrumentationkey
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsights.properties.ConnectionString
        }
        {
          name: 'MESSAGE_ARCHIVE_BLOB_SERVICE_URI'
          value: 'https://${messageArchiveStorageAccount.name}.blob.${environment().suffixes.storage}'
        }
        {
          name: 'FUNCTIONAPPIDENTITY_CLIENTID'
          value: managedIdentity.properties.clientId
        }
        {
          name: 'PRODUCTION_ORDER_EVENT_HUB_NAME'
          value: productionOrderEventHubName
        }
        {
          name: 'PRODUCTION_ORDER_EVENT_HUB_CONSUMER_GROUP'
          value: productionOrderEventHubConsumerGroupName
        }
        {
          name: 'PRODUCTION_ORDER_SERVICE_BUS_TOPIC_NAME'
          value: productionOrderServiceBusTopicName
        }
        {
          name: 'IDOC_MATERIAL_MASTER_SERVICE_BUS_TOPIC_NAME'
          value: idocMaterialMasterServiceBusTopicName
        }
        {
          name: 'SERVICE_BUS_IDOC_MATERIAL_MASTER_TOPIC_SUBSCRIPTION'
          value: azureFunctionIDocMaterialMasterTopicSubscriptionName
        }
        {
          name: 'SERVICE_BUS_IDOC_MATERIAL_MASTER_TOPIC_V2_SUBSCRIPTION'
          value: azureFunctionIDocMaterialMasterV2TopicSubscriptionName
        }
        {
          name: 'MATERIAL_MASTER_V1_SERVICE_BUS_TOPIC_NAME'
          value: materialMasterV1ServiceBusTopicName
        }
        {
          name: 'MATERIAL_MASTER_V2_SERVICE_BUS_TOPIC_NAME'
          value: materialMasterV2ServiceBusTopicName
        }
        // Batch
        {
          name: 'BATCH_EVENT_HUB_NAME'
          value: batchEventHubName
        }
        {
          name: 'BATCH_EVENT_HUB_CONSUMER_GROUP'
          value: batchEventHubConsumerGroupName
        }
        {
          name: 'BATCH_SERVICE_BUS_TOPIC_NAME'
          value: batchServiceBusTopicName
        }
        {
          name: 'INVENTORY_LOCATION_MOVE_EVENT_HUB_NAME'
          value: inventoryLocationMoveEventHubName
        }
        {
          name: 'INVENTORY_LOCATION_MOVE_EVENT_HUB_CONSUMER_GROUP'
          value: inventoryLocationMoveEventHubConsumerGroupName
        }
        {
          name: 'INVENTORY_LOCATION_MOVE_SERVICE_BUS_TOPIC_NAME'
          value: inventoryLocationMoveServiceBusTopicName
        }
        // INSPECTION LOT
        {
          name: 'INSPECTION_LOT_EVENT_HUB_NAME'
          value: inspectionLotEventHubName
        }
        {
          name: 'INSPECTION_LOT_EVENT_HUB_CONSUMER_GROUP'
          value: inspectionLotEventHubConsumerGroupName
        }
        {
          name: 'INSPECTION_LOT_SERVICE_BUS_TOPIC_NAME'
          value: inspectionLotServiceBusTopicName
        }
        {
          name: 'COA_DELIVERY_EVENT_HUB_NAME'
          value: coaDeliveryEventHubName
        }
        {
          name: 'COA_DELIVERY_EVENT_HUB_CONSUMER_GROUP'
          value: coaDeliveryConsumerGroupName
        }
        {
          name: 'COA_INTEGRATION_SERVICE_BUS_TOPIC_NAME'
          value: coaIntegrationServiceBusTopicName
        }
        {
          name: 'SapEventHubConnection__fullyQualifiedNamespace'
          value: '${eventHubNamespace}.servicebus.windows.net'
        }
        {
          name: 'SapEventHubConnection__credential'
          value: 'managedidentity'
        }
        {
          name: 'SapEventHubConnection__clientId'
          value: managedIdentity.properties.clientId
        }
        {
          name: 'MesServiceBusConnection__fullyQualifiedNamespace'
          value: '${serviceBusNamespaceName}.servicebus.windows.net'
        }
        {
          name: 'MesServiceBusConnection__credential'
          value: 'managedidentity'
        }
        {
          name: 'MesServiceBusConnection__clientId'
          value: managedIdentity.properties.clientId
        }
        // SAP API 
        {
          name: 'SAP_API_URL'
          value: sapApiUrl
        }
        {
          name: 'SAP_API_KEY'
          value: sapApiKey
        }
        {
          name: 'SAP_API_PRODORDER_MAX_RETRIES'
          value: sapApiProdOrderMaxRetries
        }
        {
          name: 'SAP_API_PRODORDER_LAST_CHANGE_TIME_THRESHOLD'
          value: sapApiProdOrderLastChangeTimeThreshold
        }
        {
          name: 'SAP_API_PRODORDER_RETRY_DELAY'
          value: sapApiProdOrderRetryDelay
        }
      ]
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
    }
    // See https://learn.microsoft.com/en-us/azure/templates/microsoft.web/sites?pivots=deployment-language-bicep#functionappconfig
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${functionAppStorageAccount.properties.primaryEndpoints.blob}${functionAppStorageAccount::blobServices::deploymentContainer.name}'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      runtime: {
        name: 'node'
        version: '20'
      }
      scaleAndConcurrency: {
        // Valid values are 512, 2048, 4096
        instanceMemoryMB: 2048
        // Valid range is [40, 1000]
        maximumInstanceCount: 40
        alwaysReady: [
          {
            instanceCount: 1
            name: 'function:SAPBatchEventHubConsumer'
          }
          // {
          //   instanceCount: 1
          //   name: 'function:SAPBatchReceiver'
          // }
          {
            instanceCount: 1
            name: 'function:SAPInspectionLotEventHubConsumer'
          }
          // {
          //   instanceCount: 1
          //   name: 'function:SAPInspectionLotReceiver'
          // }
          {
            instanceCount: 1
            name: 'function:SAPInverntoryLocationMoveEventHubConsumer'
          }
          {
            instanceCount: 1
            name: 'function:SAPInventoryLocationMoveReceiver'
          }
          // {
          //   instanceCount: 1
          //   name: 'function:SAPMaterialMasterServiceBusReceiver'
          // }
          {
            instanceCount: 1
            name: 'function:SAPProductionOrderEventHubConsumer'
          }
          // {
          //   instanceCount: 1
          //   name: 'function:SAPProductionOrderReceiver'
          // }
        ]
      }
    }
    httpsOnly: true
  }
}
