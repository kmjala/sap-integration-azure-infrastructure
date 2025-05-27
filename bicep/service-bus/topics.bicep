param serviceBusNamespaceName string
param managedIdentityName string

@description('SAP sends Material Master IDOCs to this topic')
output materialMasterIdocTopicName string = materialMasterIdocTopic.outputs.topicName
module materialMasterIdocTopic 'sap-topic.bicep' = {
  name: 'material-master-idoc'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'material-master-idoc-topic'
  }
}

@description('The Function App of this repository sends enriched Material Master messages to this topic')
output materialMasterV1TopicName string = materialMasterV1Topic.outputs.topicName
module materialMasterV1Topic 'enrichment-topic.bicep' = {
  name: 'material-master-v1-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'material-master-v1-topic'
    managedIdentityName: managedIdentityName
  }
}

@description('The Function App of this repository sends enriched V2 Material Master messages to this topic')
output materialMasterV2TopicName string = materialMasterV2Topic.outputs.topicName
module materialMasterV2Topic 'enrichment-topic.bicep' = {
  name: 'material-master-v2-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'material-master-v2-topic'
    managedIdentityName: managedIdentityName
  }
}

@description('SAP sends Production Order events to this topic')
output productionOrderSapTopicName string = productionOrderSapTopic.outputs.topicName
module productionOrderSapTopic 'sap-topic.bicep' = {
  name: 'production-order-sap-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'production-order-sap-topic'
  }
}

@description('The Function App of this repository sends enriched Production Order messages to this topic')
output productionOrderV1TopicName string = productionOrderV1Topic.outputs.topicName
module productionOrderV1Topic 'enrichment-topic.bicep' = {
  name: 'production-order-v1-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'production-order-v1-topic'
    managedIdentityName: managedIdentityName
  }
}

@description('SAP sends Batch events to this topic')
output batchSapTopicName string = batchSapTopic.outputs.topicName
module batchSapTopic 'sap-topic.bicep' = {
  name: 'batch-sap-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'batch-sap-topic'
  }
}

@description('The Function App of this repository sends enriched Batch messages to this topic')
output batchV1TopicName string = batchV1Topic.outputs.topicName
module batchV1Topic 'enrichment-topic.bicep' = {
  name: 'batch-v1-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'batch-v1-topic'
    managedIdentityName: managedIdentityName
  }
}

@description('SAP sends Inventory Location Move events to this topic')
output inventoryLocationMoveSapTopicName string = inventoryLocationMoveSapTopic.outputs.topicName
module inventoryLocationMoveSapTopic 'sap-topic.bicep' = {
  name: 'inventory-location-move-sap-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'inventory-location-move-sap-topic'
  }
}

@description('The Function App of this repository sends enriched Inventory Location Move messages to this topic')
output inventoryLocationMoveV1TopicName string = inventoryLocationMoveV1Topic.outputs.topicName
module inventoryLocationMoveV1Topic 'enrichment-topic.bicep' = {
  name: 'inventory-location-move-v1-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'inventory-location-move-v1-topic'
    managedIdentityName: managedIdentityName
  }
}

@description('SAP sends Inspection Lot events to this topic')
output inspectionLotSapTopicName string = inspectionLotSapTopic.outputs.topicName
module inspectionLotSapTopic 'sap-topic.bicep' = {
  name: 'inspection-lot-sap-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'inspection-lot-sap-topic'
  }
}

@description('The Function App of this repository sends enriched Inspection Lot messages to this topic')
output inspectionLotV1TopicName string = inspectionLotV1Topic.outputs.topicName
module inspectionLotV1Topic 'enrichment-topic.bicep' = {
  name: 'inspection-lot-v1-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'inspection-lot-v1-topic'
    managedIdentityName: managedIdentityName
  }
}

output coaIntegrationSapTopicName string = coaIntegrationSapTopic.outputs.topicName
module coaIntegrationSapTopic 'sap-topic.bicep' = {
  name: 'coa-integration-sap-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'coa-integration-sap-topic'
  }
}

output coaIntegrationV1TopicName string = coaIntegrationV1Topic.outputs.topicName
module coaIntegrationV1Topic 'enrichment-topic.bicep' = {
  name: 'coa-integration-v1-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'coa-integration-v1-topic'
    managedIdentityName: managedIdentityName
  }
}

output pleinfeldWamasStoringTaskV1TopicName string = pleinfeldWamasStoringTaskV1Topic.outputs.topicName
module pleinfeldWamasStoringTaskV1Topic 'sap-topic.bicep' = {
  name: 'pleinfeld-wamas-storing-task-sap-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'pleinfeld-wamas-storing-task-sap-topic'
  }
}

output pleinfeldWamasPickingTaskV1TopicName string = pleinfeldWamasPickingTaskV1Topic.outputs.topicName
module pleinfeldWamasPickingTaskV1Topic 'sap-topic.bicep' = {
  name: 'pleinfeld-wamas-picking-task-sap-topic'
  params: {
    serviceBusNamespaceName: serviceBusNamespaceName
    topicName: 'pleinfeld-wamas-picking-task-sap-topic'
  }
}
