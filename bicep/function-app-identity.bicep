param location string

// Event Hub
param eventHubNamespaceName string
param productionOrderEventHubName string
param batchEventHubName string
param inventoryLocationMoveEventHubName string
param inspectionLotEventHubName string
param coaDeliveryEventHubName string

output managedIdentityName string = managedIdentity.name

@description('Identity for the Function App')
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'mi-fa-${uniqueString(resourceGroup().id)}'
  location: location
  tags: resourceGroup().tags
}

// ----------------------------------------------------------------------------
// Event hubs

resource eventHubNamespace 'Microsoft.EventHub/namespaces@2024-01-01' existing = {
  name: eventHubNamespaceName

  resource productionOrderEventHub 'eventHubs' existing = {
    name: productionOrderEventHubName
  }

  resource batchEventHub 'eventHubs' existing = {
    name: batchEventHubName
  }

  resource inventoryLocationMoveEventHub 'eventHubs' existing = {
    name: inventoryLocationMoveEventHubName
  }

  resource inspectionLotEventHub 'eventHubs' existing = {
    name: inspectionLotEventHubName
  }

  resource coaDeliveryEventHub 'eventHubs' existing = {
    name: coaDeliveryEventHubName
  }
}

// Receiver role for the Function App to receive messages from the event hubs
@description('This is the built-in Azure Event Hubs Data Receiver role.')
resource eventHubDataReceiverRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  scope: subscription()
  name: 'a638d3c7-ab3a-418d-83e6-5f17a39d4fde'
}

resource productionOrderEventHubRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(eventHubNamespace::productionOrderEventHub.id, managedIdentity.id, eventHubDataReceiverRoleDefinition.id)
  scope: eventHubNamespace::productionOrderEventHub
  properties: {
    description: 'Grants the Function App access to ${eventHubNamespace::productionOrderEventHub.name}'
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: eventHubDataReceiverRoleDefinition.id
  }
}

resource batchEventHubRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(eventHubNamespace::batchEventHub.id, managedIdentity.id, eventHubDataReceiverRoleDefinition.id)
  scope: eventHubNamespace::batchEventHub
  properties: {
    description: 'Grants the Function App access to ${eventHubNamespace::batchEventHub.name}'
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: eventHubDataReceiverRoleDefinition.id
  }
}

resource inventoryLocationMoveEventHubRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(
    eventHubNamespace::inventoryLocationMoveEventHub.id,
    managedIdentity.id,
    eventHubDataReceiverRoleDefinition.id
  )
  scope: eventHubNamespace::inventoryLocationMoveEventHub
  properties: {
    description: 'Grants the Function App access to ${eventHubNamespace::inventoryLocationMoveEventHub.name}'
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: eventHubDataReceiverRoleDefinition.id
  }
}

resource inspectionLotEventHubRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(eventHubNamespace::inspectionLotEventHub.id, managedIdentity.id, eventHubDataReceiverRoleDefinition.id)
  scope: eventHubNamespace::inspectionLotEventHub
  properties: {
    description: 'Grants the Function App access to ${eventHubNamespace::inspectionLotEventHub.name}'
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: eventHubDataReceiverRoleDefinition.id
  }
}

resource coaDeliveryEventHubRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(eventHubNamespace::coaDeliveryEventHub.id, managedIdentity.id, eventHubDataReceiverRoleDefinition.id)
  scope: eventHubNamespace::coaDeliveryEventHub
  properties: {
    description: 'Grants the Function App access to ${eventHubNamespace::coaDeliveryEventHub.name}'
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: eventHubDataReceiverRoleDefinition.id
  }
}
