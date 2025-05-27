param serviceBusNamespace string
param coaIntegrationTopicName string
param coaPrincipalId string

module coaIntegrationSubscription 'subscription.bicep' = {
  name: 'coaIntegrationSubscription'
  params: {
    serviceBusNamespaceName: serviceBusNamespace
    topicName: coaIntegrationTopicName
    receiverName: 'aca'
    principalId: coaPrincipalId
    requiresSession: false
  }
}
