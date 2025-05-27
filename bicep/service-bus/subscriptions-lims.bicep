param serviceBusNamespace string
param materialMasterV1ServiceBusTopicName string
param inspectionLotV1TopicName string
param limsFunctionAppPrincipalId string

var receiverName = 'lims'

module materialMasterV1Subscription 'subscription.bicep' = {
  name: '${receiverName}-materialMasterSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: materialMasterV1ServiceBusTopicName
    receiverName: receiverName
    principalId: limsFunctionAppPrincipalId
    requiresSession: true
  }
}

module inspectionLotV1Subscription 'subscription.bicep' = {
  name: '${receiverName}-inspectionLotSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: inspectionLotV1TopicName
    receiverName: receiverName
    principalId: limsFunctionAppPrincipalId
    requiresSession: true
  }
}
