param serviceBusNamespace string
param productionOrderV1TopicName string
param inventoryLocationMoveV1TopicName string
param inspectionLotV1TopicName string
param mes78FunctionAppPrincipalId string

var receiverName = 'mes78'

module productionOrderV1Subscription 'subscription.bicep' = {
  name: '${receiverName}-productionOrderSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: productionOrderV1TopicName
    receiverName: receiverName
    principalId: mes78FunctionAppPrincipalId
    requiresSession: true
  }
}

module inventoryLocationMoveV1Subscription 'subscription.bicep' = {
  name: '${receiverName}-inventoryLocationMoveSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: inventoryLocationMoveV1TopicName
    receiverName: receiverName
    principalId: mes78FunctionAppPrincipalId
    requiresSession: true
  }
}

module inspectionLotV1Subscription 'subscription.bicep' = {
  name: '${receiverName}-inspectionLotSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: inspectionLotV1TopicName
    receiverName: receiverName
    principalId: mes78FunctionAppPrincipalId
    requiresSession: true
  }
}
