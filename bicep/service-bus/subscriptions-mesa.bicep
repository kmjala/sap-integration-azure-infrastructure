param serviceBusNamespace string
param materialMasterV1ServiceBusTopicName string
param productionOrderV1TopicName string
param batchV1TopicName string
param inventoryLocationMoveV1TopicName string
param inspectionLotV1TopicName string
param mesaFunctionAppPrincipalId string

var receiverName = 'mesa'

module materialMasterV1Subscription 'subscription.bicep' = {
  name: '${receiverName}-materialMasterSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: materialMasterV1ServiceBusTopicName
    receiverName: receiverName
    principalId: mesaFunctionAppPrincipalId
    requiresSession: true
  }
}

module productionOrderV1Subscription 'subscription.bicep' = {
  name: '${receiverName}-productionOrderSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: productionOrderV1TopicName
    receiverName: receiverName
    principalId: mesaFunctionAppPrincipalId
    requiresSession: true
  }
}

module batchV1Subscription 'subscription.bicep' = {
  name: '${receiverName}-batchSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: batchV1TopicName
    receiverName: receiverName
    principalId: mesaFunctionAppPrincipalId
    requiresSession: true
  }
}

module inventoryLocationMoveV1Subscription 'subscription.bicep' = {
  name: '${receiverName}-inventoryLocationMoveSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: inventoryLocationMoveV1TopicName
    receiverName: receiverName
    principalId: mesaFunctionAppPrincipalId
    requiresSession: true
  }
}

module inspectionLotV1Subscription 'subscription.bicep' = {
  name: '${receiverName}-inspectionLotSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: inspectionLotV1TopicName
    receiverName: receiverName
    principalId: mesaFunctionAppPrincipalId
    requiresSession: true
  }
}
