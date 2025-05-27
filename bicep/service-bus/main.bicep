@description('Location for all resources.')
param location string = resourceGroup().location
param managedIdentityName string
param coaPrincipalId string
param compassFunctionAppPrincipalId string
param nemo01FunctionAppPrincipalId string
param mesaFunctionAppPrincipalId string
param limsFunctionAppPrincipalId string
param mes78FunctionAppPrincipalId string
param pleinfeldWamasFunctionAppPrincipalId string

output namespaceName string = serviceBusNamespace.name
// from SAP topics
output idocMaterialMasterTopicName string = topics.outputs.materialMasterIdocTopicName
output azureFunctionIDocMaterialMasterTopicSubscriptionName string = subscriptions.outputs.materialMasterIdocFunctionAppSubscriptionName
output azureFunctionIDocMaterialMasterV2TopicSubscriptionName string = subscriptions.outputs.materialMasterIdocV2FunctionAppSubscriptionName
output productionOrderSapTopicName string = topics.outputs.productionOrderSapTopicName
output productionOrderSapTopicSubscriptionName string = subscriptions.outputs.productionOrderSapFunctionAppSubscriptionName
output batchSapTopicName string = topics.outputs.batchSapTopicName
output batchSapTopicSubscriptionName string = subscriptions.outputs.batchSapFunctionAppSubscriptionName
output inventoryLocationMoveSapTopicName string = topics.outputs.inventoryLocationMoveSapTopicName
output inventoryLocationMoveSapTopicSubscriptionName string = subscriptions.outputs.inventoryLocationMoveSapFunctionAppSubscriptionName
output inspectionLotSapTopicName string = topics.outputs.inspectionLotSapTopicName
output inspectionLotSapTopicSubscriptionName string = subscriptions.outputs.inspectionLotSapFunctionAppSubscriptionName
output coaIntegrationSapTopicName string = topics.outputs.coaIntegrationSapTopicName
output coaIntegrationSapTopicSubscriptionName string = subscriptions.outputs.coaIntegrationSapFunctionAppSubscriptionName

// to MES topics
output materialMasterV1TopicName string = topics.outputs.materialMasterV1TopicName
output materialMasterV2TopicName string = topics.outputs.materialMasterV2TopicName
output productionOrderTopicName string = topics.outputs.productionOrderV1TopicName
output batchTopicName string = topics.outputs.batchV1TopicName
output inventoryLocationMoveTopicName string = topics.outputs.inventoryLocationMoveV1TopicName
output inspectionLotTopicName string = topics.outputs.inspectionLotV1TopicName
output coaIntegrationTopicName string = topics.outputs.coaIntegrationV1TopicName

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/namespaces?pivots=deployment-language-bicep
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: 'sbn-${uniqueString(resourceGroup().id)}'
  location: location
  tags: resourceGroup().tags
  sku: {
    name: 'Standard'
  }
  properties: {}
}

// Creates all Service Bus topics, i.e.
// - Those SAP publishes to and the Function App in this repository consumes
//   from, e.g. Material Master IDOCs, Production Order events, etc.
// - Those the Function App in this repository publishes message to and other
//    integrations consume from, e.g. enriched Material Master, etc.
module topics 'topics.bicep' = {
  name: 'topics'
  params: {
    serviceBusNamespaceName: serviceBusNamespace.name
    managedIdentityName: managedIdentityName
  }
}

// Creates all subscriptions, i.e.
// - Those the Function App in this repository uses to consume from the topics
//    where SAP publishes messages to, e.g. Material Master IDOCs, etc.
// - Those the downstream integrations (Compass, Nemo, ...) use to consume from
//   the topics where the Function App in this repository publishes message to
module subscriptions 'subscriptions.bicep' = {
  name: 'subscriptions'
  params: {
    serviceBusNamespace: serviceBusNamespace.name
    materialMasterIdocServiceBusTopicName: topics.outputs.materialMasterIdocTopicName
    materialMasterV1ServiceBusTopicName: topics.outputs.materialMasterV1TopicName
    materialMasterV2ServiceBusTopicName: topics.outputs.materialMasterV2TopicName
    productionOrderSapTopicName: topics.outputs.productionOrderSapTopicName
    productionOrderV1TopicName: topics.outputs.productionOrderV1TopicName
    batchSapTopicName: topics.outputs.batchSapTopicName
    batchV1TopicName: topics.outputs.batchV1TopicName
    inventoryLocationMoveSapTopicName: topics.outputs.inventoryLocationMoveSapTopicName
    inventoryLocationMoveV1TopicName: topics.outputs.inventoryLocationMoveV1TopicName
    inspectionLotSapTopicName: topics.outputs.inspectionLotSapTopicName
    inspectionLotV1TopicName: topics.outputs.inspectionLotV1TopicName
    coaIntegrationSapTopicName: topics.outputs.coaIntegrationSapTopicName
    coaIntegrationTopicName: topics.outputs.coaIntegrationV1TopicName
    pleinfeldWamasPickingTaskV1ServiceBusTopicName: topics.outputs.pleinfeldWamasPickingTaskV1TopicName
    pleinfeldWamasStoringTaskV1ServiceBusTopicName: topics.outputs.pleinfeldWamasStoringTaskV1TopicName

    functionAppManagedIdentityName: managedIdentityName

    compassFunctionAppPrincipalId: compassFunctionAppPrincipalId
    nemo01FunctionAppPrincipalId: nemo01FunctionAppPrincipalId
    mesaFunctionAppPrincipalId: mesaFunctionAppPrincipalId
    limsFunctionAppPrincipalId: limsFunctionAppPrincipalId
    coaPrincipalId: coaPrincipalId
    mes78FunctionAppPrincipalId: mes78FunctionAppPrincipalId
    pleinfeldWamasFunctionAppPrincipalId: pleinfeldWamasFunctionAppPrincipalId
  }
}
