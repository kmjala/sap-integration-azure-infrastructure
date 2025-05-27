// Creates a Service Bus topic that the Function App can publish to.
// 
// This is intended for those messages coming from SAP, which the Function App
// processes and then publishes to another topic (this one), so that others
// can consume the enriched message.

param serviceBusNamespaceName string
param topicName string
param managedIdentityName string

output topicName string = topicName

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/namespaces?pivots=deployment-language-bicep
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' existing = {
  name: serviceBusNamespaceName

  // See https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/namespaces/topics?pivots=deployment-language-bicep
  resource topic 'topics' = {
    name: topicName
    properties: {}
  }
}

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: managedIdentityName
}

// See https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/integration#azure-service-bus-data-sender
@description('This is the built-in Azure Service Bus Data Sender role.')
resource serviceBusDataSenderRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  scope: subscription()
  name: '69a216fc-b8fb-44d8-bc22-1f3c2cd27a39'
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(serviceBusNamespace::topic.id, managedIdentity.id, serviceBusDataSenderRoleDefinition.id)
  scope: serviceBusNamespace::topic
  properties: {
    description: 'Grants the Function App ${managedIdentityName} access to ${topicName}'
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: serviceBusDataSenderRoleDefinition.id
  }
}
