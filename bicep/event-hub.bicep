// Reference: https://github.com/Azure/azure-quickstart-templates/blob/93d59fbb5946cc94bd239daaf9bf0fd8ef89d02d/quickstarts/microsoft.apimanagement/api-management-logs-to-moesif-using-eventhub-webapp/nested/microsoft.eventhub/namespaces.bicep

@description('Specifies the Azure location for all resources.')
param location string = resourceGroup().location

output namespaceName string = sapIntegrationEventHubNamespace.name
output productionOrderEventHubName string = productionOrderEventHub.name
output productionOrderConsumerGroupName string = productionOrderEventHub::consumerGroup.name
output batchEventHubName string = batchEventHub.name
output batchConsumerGroupName string = batchEventHub::consumerGroup.name
output inventoryLocationMoveEventHubName string = inventoryLocationMoveEventHub.name
output inventoryLocationMoveConsumerGroupName string = inventoryLocationMoveEventHub::consumerGroup.name
output inspectionLotEventHubName string = inspectionLotEventHub.name
output inspectionLotConsumerGroupName string = inspectionLotEventHub::consumerGroup.name
output coaDeliveryEventHubName string = coaDeliveryEventHub.name
output coaDeliveryConsumerGroupName string = coaDeliveryEventHub::consumerGroup.name


// See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces?pivots=deployment-language-bicep
resource sapIntegrationEventHubNamespace 'Microsoft.EventHub/namespaces@2024-01-01' = {
  name: 'evhns-${uniqueString(resourceGroup().id)}'
  location: location
  tags: resourceGroup().tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
    capacity: 1
  }
  properties: {
    isAutoInflateEnabled: false
    maximumThroughputUnits: 0
  }
}

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces/eventhubs?pivots=deployment-language-bicep
resource productionOrderEventHub 'Microsoft.EventHub/namespaces/eventhubs@2024-01-01' = {
  parent: sapIntegrationEventHubNamespace
  name: 'eh-production-order-${uniqueString(resourceGroup().id)}'
  properties: {
    messageRetentionInDays: 7
    partitionCount: 1
    status: 'Active'
  }

  resource consumerGroup 'consumergroups' = {
    name: 'sap-events-production-order-consumer-group'
  }

  // See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces/eventhubs/authorizationrules?pivots=deployment-language-bicep
  resource eventHubSendAuthorizationRule 'authorizationRules' = {
    name: 'sap'
    properties: {
      rights: [
        'Send'
      ]
    }
  }
}


// See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces/eventhubs?pivots=deployment-language-bicep
resource batchEventHub 'Microsoft.EventHub/namespaces/eventhubs@2024-01-01' = {
  parent: sapIntegrationEventHubNamespace
  name: 'eh-batch-${uniqueString(resourceGroup().id)}'
  properties: {
    messageRetentionInDays: 7
    partitionCount: 1
    status: 'Active'
  }

  resource consumerGroup 'consumergroups' = {
    name: 'sap-events-batch-consumer-group'
  }

  // See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces/eventhubs/authorizationrules?pivots=deployment-language-bicep
  resource eventHubSendAuthorizationRule 'authorizationRules' = {
    name: 'sap'
    properties: {
      rights: [
        'Send'
      ]
    }
  }
}


// See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces/eventhubs?pivots=deployment-language-bicep
resource inventoryLocationMoveEventHub 'Microsoft.EventHub/namespaces/eventhubs@2024-01-01' = {
  parent: sapIntegrationEventHubNamespace
  name: 'eh-inventory-location-move-${uniqueString(resourceGroup().id)}'
  properties: {
    messageRetentionInDays: 7
    partitionCount: 1
    status: 'Active'
  }

  resource consumerGroup 'consumergroups' = {
    name: 'sap-eventsinventory-location-move-consumer-group'
  }

  // See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces/eventhubs/authorizationrules?pivots=deployment-language-bicep
  resource eventHubSendAuthorizationRule 'authorizationRules' = {
    name: 'sap'
    properties: {
      rights: [
        'Send'
      ]
    }
  }
}


// See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces/eventhubs?pivots=deployment-language-bicep
resource inspectionLotEventHub 'Microsoft.EventHub/namespaces/eventhubs@2024-01-01' = {
  parent: sapIntegrationEventHubNamespace
  name: 'eh-inspection-lot-${uniqueString(resourceGroup().id)}'
  properties: {
    messageRetentionInDays: 7
    partitionCount: 1
    status: 'Active'
  }

  resource consumerGroup 'consumergroups' = {
    name: 'sap-events-inspection-lot-consumer-group'
  }

  // See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces/eventhubs/authorizationrules?pivots=deployment-language-bicep
  resource eventHubSendAuthorizationRule 'authorizationRules' = {
    name: 'sap'
    properties: {
      rights: [
        'Send'
      ]
    }
  }
}

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces/eventhubs?pivots=deployment-language-bicep
resource coaDeliveryEventHub 'Microsoft.EventHub/namespaces/eventhubs@2024-01-01' = {
  parent: sapIntegrationEventHubNamespace
  name: 'eh-coa-delivery-${uniqueString(resourceGroup().id)}'
  properties: {
    messageRetentionInDays: 7
    partitionCount: 1
    status: 'Active'
  }

  resource consumerGroup 'consumergroups' = {
    name: 'sap-events-coa-delivery-consumer-group'
  }

  // See https://learn.microsoft.com/en-us/azure/templates/microsoft.eventhub/namespaces/eventhubs/authorizationrules?pivots=deployment-language-bicep
  resource eventHubSendAuthorizationRule 'authorizationRules' = {
    name: 'sap'
    properties: {
      rights: [
        'Send'
      ]
    }
  }
}
