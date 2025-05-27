param serviceBusNamespace string
param materialMasterIdocServiceBusTopicName string
param productionOrderSapTopicName string
param batchSapTopicName string
param inventoryLocationMoveSapTopicName string
param inspectionLotSapTopicName string
param functionAppManagedIdentityName string
param coaIntegrationSapTopicName string

var receiverName = 'azure-function'
var receiverNameV2 = 'azure-function-v2'

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: functionAppManagedIdentityName
}

output materialMasterIdocSubscriptionName string = materialMasterIdocSubscription.outputs.subscriptionName
module materialMasterIdocSubscription 'subscription.bicep' = {
  name: '${receiverName}-materialMasterIdocSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: materialMasterIdocServiceBusTopicName
    receiverName: receiverName
    principalId: managedIdentity.properties.principalId
    requiresSession: false
  }
}

output materialMasterV2IdocSubscriptionName string = materialMasterV2IdocSubscription.outputs.subscriptionName
module materialMasterV2IdocSubscription 'subscription.bicep' = {
  name: '${receiverNameV2}-materialMasterIdocSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: materialMasterIdocServiceBusTopicName
    receiverName: receiverNameV2
    principalId: managedIdentity.properties.principalId
    requiresSession: false
  }
}

output productionOrderSapSubscriptionName string = productionOrderSapSubscription.outputs.subscriptionName
module productionOrderSapSubscription 'subscription.bicep' = {
  name: '${receiverName}-productionOrderSapSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: productionOrderSapTopicName
    receiverName: receiverName
    principalId: managedIdentity.properties.principalId
    requiresSession: false
  }
}

output batchSapSubscriptionName string = batchSapSubscription.outputs.subscriptionName
module batchSapSubscription 'subscription.bicep' = {
  name: '${receiverName}-batchSapSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: batchSapTopicName
    receiverName: receiverName
    principalId: managedIdentity.properties.principalId
    requiresSession: false
  }
}

output inventoryLocationMoveSapSubscriptionName string = inventoryLocationMoveSapSubscription.outputs.subscriptionName
module inventoryLocationMoveSapSubscription 'subscription.bicep' = {
  name: '${receiverName}-inventoryLocationMoveSapSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: inventoryLocationMoveSapTopicName
    receiverName: receiverName
    principalId: managedIdentity.properties.principalId
    requiresSession: false
  }
}

output inspectionLotSapSubscriptionName string = inspectionLotSapSubscription.outputs.subscriptionName
module inspectionLotSapSubscription 'subscription.bicep' = {
  name: '${receiverName}-inspectionLotSapSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: inspectionLotSapTopicName
    receiverName: receiverName
    principalId: managedIdentity.properties.principalId
    requiresSession: false
  }
}

output coaIntegrationSapSubscriptionName string = coaIntegrationSapSubscription.outputs.subscriptionName
module coaIntegrationSapSubscription 'subscription.bicep' = {
  name: '${receiverName}-coaIntegrationSapSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: coaIntegrationSapTopicName
    receiverName: receiverName
    principalId: managedIdentity.properties.principalId
    requiresSession: false
  }
}
