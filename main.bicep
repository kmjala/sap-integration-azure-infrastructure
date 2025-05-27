output functionAppName string = functionApp.outputs.functionAppName

@description('The principal ID of the Function App in sap-compass-azure-integration')
param compassFunctionAppPrincipalId string

@description('The principal ID of the Function App in sap-nemo-01-azure-integration')
param nemo01FunctionAppPrincipalId string

@description('The principal ID of the Function App in sap-mesa-azure-integration')
param mesaFunctionAppPrincipalId string

@description('The principal ID of the Azure Container App in sap-surround-coa')
param coaPrincipalId string

@description('The principal ID of the Function App in sap-mes78-azure-integration')
param mes78FunctionAppPrincipalId string

@description('The principal ID of the Function App in sap-lims-azure-integration')
param limsFunctionAppPrincipalId string

@description('The principal ID of the Function App in sap-pleinfeld-wamas-azure-integration')
param pleinfeldWamasFunctionAppPrincipalId string

param sapApiUrl string
@secure()
param sapApiKey string

@description('The threshold for the difference between the event timestamp and the last change date time of a production order in SAP')
param sapApiProdOrderLastChangeTimeThreshold string
@description('The delay between retries for SAP API production order calls')
param sapApiProdOrderRetryDelay string
@description('The maximum number of retries for SAP API production order calls')
param sapApiProdOrderMaxRetries string

module functionApp 'bicep/function-app.bicep' = {
  name: 'functionApp'
  params: {
    eventHubNamespace: eventHub.outputs.namespaceName
    productionOrderEventHubName: eventHub.outputs.productionOrderEventHubName
    productionOrderEventHubConsumerGroupName: eventHub.outputs.productionOrderConsumerGroupName
    serviceBusNamespaceName: serviceBus.outputs.namespaceName
    idocMaterialMasterServiceBusTopicName: serviceBus.outputs.idocMaterialMasterTopicName
    azureFunctionIDocMaterialMasterTopicSubscriptionName: serviceBus.outputs.azureFunctionIDocMaterialMasterTopicSubscriptionName
    azureFunctionIDocMaterialMasterV2TopicSubscriptionName: serviceBus.outputs.azureFunctionIDocMaterialMasterV2TopicSubscriptionName
    materialMasterV1ServiceBusTopicName: serviceBus.outputs.materialMasterV1TopicName
    materialMasterV2ServiceBusTopicName: serviceBus.outputs.materialMasterV2TopicName
    productionOrderServiceBusTopicName: serviceBus.outputs.productionOrderTopicName
    batchEventHubName: eventHub.outputs.batchEventHubName
    batchEventHubConsumerGroupName: eventHub.outputs.batchConsumerGroupName
    batchServiceBusTopicName: serviceBus.outputs.batchTopicName
    inventoryLocationMoveEventHubName: eventHub.outputs.inventoryLocationMoveEventHubName
    inventoryLocationMoveEventHubConsumerGroupName: eventHub.outputs.inventoryLocationMoveConsumerGroupName
    inventoryLocationMoveServiceBusTopicName: serviceBus.outputs.inventoryLocationMoveTopicName
    inspectionLotEventHubConsumerGroupName: eventHub.outputs.inspectionLotConsumerGroupName
    inspectionLotEventHubName: eventHub.outputs.inspectionLotEventHubName
    inspectionLotServiceBusTopicName: serviceBus.outputs.inspectionLotTopicName
    managedIdentityName: functionAppIdentity.outputs.managedIdentityName
    sapApiUrl: sapApiUrl
    sapApiKey: sapApiKey
    storageAccountName: storageAccount.outputs.name
    coaDeliveryConsumerGroupName: eventHub.outputs.coaDeliveryConsumerGroupName
    coaDeliveryEventHubName: eventHub.outputs.coaDeliveryEventHubName
    coaIntegrationServiceBusTopicName: serviceBus.outputs.coaIntegrationTopicName
    applicationInsightsName: logAnalytics.outputs.applicationInsightsName
    sapApiProdOrderLastChangeTimeThreshold: sapApiProdOrderLastChangeTimeThreshold
    sapApiProdOrderMaxRetries: sapApiProdOrderMaxRetries
    sapApiProdOrderRetryDelay: sapApiProdOrderRetryDelay
  }
}

module storageAccount 'bicep/storage-account.bicep' = {
  name: 'storageAccount'
  params: {
    location: resourceGroup().location
    functionAppIdentityName: functionAppIdentity.outputs.managedIdentityName
    coaPrincipalId: coaPrincipalId
  }
}

module logAnalytics 'bicep/log-analytics.bicep' = {
  name: 'logAnalytics'
  params: {
    location: resourceGroup().location
  }
}

module serviceBus 'bicep/service-bus/main.bicep' = {
  name: 'serviceBus'
  params: {
    managedIdentityName: functionAppIdentity.outputs.managedIdentityName
    compassFunctionAppPrincipalId: compassFunctionAppPrincipalId
    nemo01FunctionAppPrincipalId: nemo01FunctionAppPrincipalId
    mesaFunctionAppPrincipalId: mesaFunctionAppPrincipalId
    limsFunctionAppPrincipalId: limsFunctionAppPrincipalId
    coaPrincipalId: coaPrincipalId
    mes78FunctionAppPrincipalId: mes78FunctionAppPrincipalId
    pleinfeldWamasFunctionAppPrincipalId: pleinfeldWamasFunctionAppPrincipalId
  }
}

module eventHub 'bicep/event-hub.bicep' = {
  name: 'eventHub'
  params: {}
}

module functionAppIdentity 'bicep/function-app-identity.bicep' = {
  name: 'functionAppManagedIdentityRoleAssignments'
  params: {
    eventHubNamespaceName: eventHub.outputs.namespaceName
    location: resourceGroup().location
    productionOrderEventHubName: eventHub.outputs.productionOrderEventHubName
    batchEventHubName: eventHub.outputs.batchEventHubName
    inventoryLocationMoveEventHubName: eventHub.outputs.inventoryLocationMoveEventHubName
    inspectionLotEventHubName: eventHub.outputs.inspectionLotEventHubName
    coaDeliveryEventHubName: eventHub.outputs.coaDeliveryEventHubName
  }
}
