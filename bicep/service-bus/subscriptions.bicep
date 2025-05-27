param serviceBusNamespace string
param materialMasterIdocServiceBusTopicName string
param materialMasterV1ServiceBusTopicName string
param materialMasterV2ServiceBusTopicName string
param productionOrderSapTopicName string
param productionOrderV1TopicName string
param batchSapTopicName string
param batchV1TopicName string
param inventoryLocationMoveSapTopicName string
param inventoryLocationMoveV1TopicName string
param inspectionLotSapTopicName string
param inspectionLotV1TopicName string
param coaIntegrationSapTopicName string
param coaIntegrationTopicName string
param pleinfeldWamasPickingTaskV1ServiceBusTopicName string
param pleinfeldWamasStoringTaskV1ServiceBusTopicName string

param functionAppManagedIdentityName string

param compassFunctionAppPrincipalId string
param nemo01FunctionAppPrincipalId string
param mesaFunctionAppPrincipalId string
param coaPrincipalId string
param limsFunctionAppPrincipalId string
param mes78FunctionAppPrincipalId string
param pleinfeldWamasFunctionAppPrincipalId string

output materialMasterIdocFunctionAppSubscriptionName string = functionAppSubscriptions.outputs.materialMasterIdocSubscriptionName
output materialMasterIdocV2FunctionAppSubscriptionName string = functionAppSubscriptions.outputs.materialMasterV2IdocSubscriptionName
output productionOrderSapFunctionAppSubscriptionName string = functionAppSubscriptions.outputs.productionOrderSapSubscriptionName
output batchSapFunctionAppSubscriptionName string = functionAppSubscriptions.outputs.batchSapSubscriptionName
output inventoryLocationMoveSapFunctionAppSubscriptionName string = functionAppSubscriptions.outputs.inventoryLocationMoveSapSubscriptionName
output inspectionLotSapFunctionAppSubscriptionName string = functionAppSubscriptions.outputs.inspectionLotSapSubscriptionName
output coaIntegrationSapFunctionAppSubscriptionName string = functionAppSubscriptions.outputs.coaIntegrationSapSubscriptionName
module functionAppSubscriptions 'subscriptions-function-app.bicep' = {
  name: 'functionAppSubscriptions'
  params: {
    serviceBusNamespace: serviceBusNamespace
    materialMasterIdocServiceBusTopicName: materialMasterIdocServiceBusTopicName
    productionOrderSapTopicName: productionOrderSapTopicName
    batchSapTopicName: batchSapTopicName
    inventoryLocationMoveSapTopicName: inventoryLocationMoveSapTopicName
    inspectionLotSapTopicName: inspectionLotSapTopicName
    functionAppManagedIdentityName: functionAppManagedIdentityName
    coaIntegrationSapTopicName: coaIntegrationSapTopicName
  }
}

module coaSubscriptions 'subscriptions-coa.bicep' = {
  name: 'coaSubscriptions'
  params: {
    serviceBusNamespace: serviceBusNamespace
    coaIntegrationTopicName: coaIntegrationTopicName
    coaPrincipalId: coaPrincipalId
  }
}

module compassSubscriptions 'subscriptions-compass.bicep' = {
  name: 'compassSubscriptions'
  params: {
    serviceBusNamespace: serviceBusNamespace
    materialMasterV1ServiceBusTopicName: materialMasterV1ServiceBusTopicName
    productionOrderV1TopicName: productionOrderV1TopicName
    batchV1TopicName: batchV1TopicName
    inventoryLocationMoveV1TopicName: inventoryLocationMoveV1TopicName
    inspectionLotV1TopicName: inspectionLotV1TopicName
    compassFunctionAppPrincipalId: compassFunctionAppPrincipalId
  }
}

var isDevEnv = subscription().subscriptionId == 'e2fda199-cfde-4565-9bb3-08b676d05cc2'
module mesaSubscriptions 'subscriptions-mesa.bicep' = if (isDevEnv) {
  name: 'mesaSubscriptions'
  params: {
    serviceBusNamespace: serviceBusNamespace
    materialMasterV1ServiceBusTopicName: materialMasterV1ServiceBusTopicName
    productionOrderV1TopicName: productionOrderV1TopicName
    batchV1TopicName: batchV1TopicName
    inventoryLocationMoveV1TopicName: inventoryLocationMoveV1TopicName
    inspectionLotV1TopicName: inspectionLotV1TopicName
    mesaFunctionAppPrincipalId: mesaFunctionAppPrincipalId
  }
}
module limsSubscriptions 'subscriptions-lims.bicep' = if (isDevEnv) {
  name: 'limsSubscriptions'
  params: {
    serviceBusNamespace: serviceBusNamespace
    materialMasterV1ServiceBusTopicName: materialMasterV1ServiceBusTopicName
    inspectionLotV1TopicName: inspectionLotV1TopicName
    limsFunctionAppPrincipalId: limsFunctionAppPrincipalId
  }
}

module nemoSubscriptions 'subscriptions-nemo01.bicep' = {
  name: 'nemoSubscriptions'
  params: {
    serviceBusNamespace: serviceBusNamespace
    materialMasterV1ServiceBusTopicName: materialMasterV1ServiceBusTopicName
    productionOrderV1TopicName: productionOrderV1TopicName
    batchV1TopicName: batchV1TopicName
    inventoryLocationMoveV1TopicName: inventoryLocationMoveV1TopicName
    inspectionLotV1TopicName: inspectionLotV1TopicName
    nemo01FunctionAppPrincipalId: nemo01FunctionAppPrincipalId
  }
}

module mes78Subscriptions 'subscriptions-mes78.bicep' = if (isDevEnv) {
  name: 'mes78Subscriptions'
  params: {
    serviceBusNamespace: serviceBusNamespace
    productionOrderV1TopicName: productionOrderV1TopicName
    inventoryLocationMoveV1TopicName: inventoryLocationMoveV1TopicName
    inspectionLotV1TopicName: inspectionLotV1TopicName
    mes78FunctionAppPrincipalId: mes78FunctionAppPrincipalId
  }
}

module pleinfeldWamasSubscriptions 'subscriptions-wamas-pleinfeld.bicep' = if (isDevEnv) {
  name: 'pleinfeldWamasSubscriptions'
  params: {
    serviceBusNamespace: serviceBusNamespace
    materialMasterV2ServiceBusTopicName: materialMasterV2ServiceBusTopicName
    pleinfeldWamasPickingTaskV1ServiceBusTopicName: pleinfeldWamasPickingTaskV1ServiceBusTopicName
    pleinfeldWamasStoringTaskV1ServiceBusTopicName: pleinfeldWamasStoringTaskV1ServiceBusTopicName
    pleinfeldWamasFunctionAppPrincipalId: pleinfeldWamasFunctionAppPrincipalId
  }
}
