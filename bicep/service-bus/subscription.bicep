// Creates a new subscription for the specified topic. Grants the specified
// principal access to consume messages from the topic.

param serviceBusNamespaceName string
param topicName string
param receiverName string
param principalId string
param requiresSession bool

output subscriptionName string = serviceBusNamespace::topic::subscription.name

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/namespaces?pivots=deployment-language-bicep
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' existing = {
  name: serviceBusNamespaceName

  // See https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/namespaces/topics?pivots=deployment-language-bicep
  resource topic 'topics' existing = {
    name: topicName

    // See https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/namespaces/topics/subscriptions?pivots=deployment-language-bicep
    resource subscription 'subscriptions' = {
      name: '${topicName}-${receiverName}'
      properties: {
        maxDeliveryCount: 2
        requiresSession: requiresSession
      }
    }
  }
}

// See https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/integration#azure-service-bus-data-receiver
@description('This is the built-in Azure Service Bus Data Receiver role.')
resource serviceBusDataReceiverRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  scope: subscription()
  name: '4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0'
}

@description('This is the built-in Azure Service Bus Data Owner role.')
resource serviceBusDataOwnerRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  scope: subscription()
  name: '090c5cfd-751d-490a-894a-3ce6f1109419'
}

resource dataReceiverRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(serviceBusNamespace::topic::subscription.id, principalId, serviceBusDataReceiverRoleDefinition.id)
  scope: serviceBusNamespace::topic::subscription
  properties: {
    description: 'Grants ${receiverName} read-access to ${topicName}'
    principalId: principalId
    roleDefinitionId: serviceBusDataReceiverRoleDefinition.id
  }
}

resource dataOwnerRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(serviceBusNamespace::topic::subscription.id, principalId, serviceBusDataOwnerRoleDefinition.id)
  scope: serviceBusNamespace::topic::subscription
  properties: {
    description: 'Grants ${receiverName} owner-access to ${topicName}'
    principalId: principalId
    roleDefinitionId: serviceBusDataOwnerRoleDefinition.id
  }
}
