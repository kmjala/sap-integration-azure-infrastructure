param serviceBusNamespace string
param materialMasterV2ServiceBusTopicName string
param pleinfeldWamasPickingTaskV1ServiceBusTopicName string
param pleinfeldWamasStoringTaskV1ServiceBusTopicName string
param pleinfeldWamasFunctionAppPrincipalId string

var receiverName = 'wamas'

module materialMasterSubscription 'subscription.bicep' = {
  name: '${receiverName}-materialMasterSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: materialMasterV2ServiceBusTopicName
    receiverName: receiverName
    principalId: pleinfeldWamasFunctionAppPrincipalId
    requiresSession: false
  }
}

module pickingTaskSubscription 'subscription.bicep' = {
  name: '${receiverName}-pickingTaskSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: pleinfeldWamasPickingTaskV1ServiceBusTopicName
    receiverName: receiverName
    principalId: pleinfeldWamasFunctionAppPrincipalId
    requiresSession: false
  }
}

module storingTaskSubscription 'subscription.bicep' = {
  name: '${receiverName}-storingTaskSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: pleinfeldWamasStoringTaskV1ServiceBusTopicName
    receiverName: receiverName
    principalId: pleinfeldWamasFunctionAppPrincipalId
    requiresSession: false
  }
}
