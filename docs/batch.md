# Batch Integration

SAP sends the Batch message (SAP JSON format) to the Azure resources provided by this repository. The incoming message (e.g. [here](../function-app/test/resources/SAPBatchEventHubConsumer/input.json)) is enriched with the data coming from the following SAP APIs:

- Get Batch Master Record by ID - [GET /batchmaster/v1/Batch(Material='{Material}',BatchIdentifyingPlant='{BatchIdentifyingPlant}',Batch='{Batch}')](https://api.sap.com/api/OP_API_BATCH_SRV_0001/resource/Batches)
- Get Batch Characteristics for Given Batch - [GET /batchmaster/v1/Batch(Material='{Material}',BatchIdentifyingPlant='{BatchIdentifyingPlant}',Batch='{Batch}')/to_BatchCharc](https://api.sap.com/api/OP_API_BATCH_SRV_0001/path/get_Batch_Material___Material___BatchIdentifyingPlant___BatchIdentifyingPlant___Batch___Batch____to_BatchCharc)
- Get Batch Characteristic Value for Given Characteristic - [GET /batchmaster/v1/BatchCharc(Material='{Material}',BatchIdentifyingPlant='{BatchIdentifyingPlant}',Batch='{Batch}',CharcInternalID='{CharcInternalID}')/to_BatchCharcValue](https://api.sap.com/api/OP_API_BATCH_SRV_0001/path/get_BatchCharc_Material___Material___BatchIdentifyingPlant___BatchIdentifyingPlant___Batch___Batch___CharcInternalID___CharcInternalID____to_BatchCharcValue)

and published to the Azure Service Bus topic _batch-v1-topic_.

The logic is contained in [SAPBatchEventHubConsumer Function](../function-app/src/functions/SAPBatchEventHubConsumer.ts) which listens to the messages from Event Hub topic _eh-batch-\*_ (as defined in [event-hub.bicep](../bicep/event-hub.bicep)) and performs the following steps:

1. Takes the IDs from the incoming message
2. Call SAP APIs with the IDs from step 1 to fetch additional data and enrich the incoming message
3. Upload the enriched message to the Azure Storage Blob Container
4. Publish the enriched message in JSON format (e.g. [here](../function-app/test/resources/SAPBatchEventHubConsumer/expected.json)) to the Service Bus queue _batch-v1-topic_

Pending messages can be viewed in the Azure Portal:

- [Azure Event Hub for Batch (DEV)](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/e2fda199-cfde-4565-9bb3-08b676d05cc2/resourceGroups/rg-arb-8f9b03a7c50e787f9a6a332d6d10a85723251c54/providers/Microsoft.EventHub/namespaces/evhns-uudmmlrz377qq/eventhubs/eh-batch-uudmmlrz377qq/explorer) (DEV)
- [Azure Event Hub for Batch (VAL)](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/d5c0187e-4b27-48b7-8592-f28f897fed9c/resourceGroups/rg-arb-a915fcf60a914831589e4348f82b54b263257fe4/providers/Microsoft.EventHub/namespaces/evhns-3usitng2rgrns/eventhubs/eh-batch-3usitng2rgrns/overview)
- [Azure Event Hub for Batch (PRD)](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/dc554c52-a946-4663-993f-ad838cc62de9/resourceGroups/rg-arb-b36ffe2259e1a7c348a5bda1f0bbb74dcd56f270/providers/Microsoft.EventHub/namespaces/evhns-52qfhgssyyol6/eventhubs/eh-batch-52qfhgssyyol6/overview)
- [Azure Service Bus _batch-v1-topic_ (DEV)](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/e2fda199-cfde-4565-9bb3-08b676d05cc2/resourceGroups/rg-arb-8f9b03a7c50e787f9a6a332d6d10a85723251c54/providers/Microsoft.ServiceBus/namespaces/sbn-uudmmlrz377qq/topics/batch-v1-topic/explorer) (DEV)
- [Azure Service Bus _batch-v1-topic_ (VAL)](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/d5c0187e-4b27-48b7-8592-f28f897fed9c/resourceGroups/rg-arb-a915fcf60a914831589e4348f82b54b263257fe4/providers/Microsoft.ServiceBus/namespaces/sbn-3usitng2rgrns/topics/batch-v1-topic/explorer)
- [Azure Service Bus _batch-v1-topic_ (PRD)](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/dc554c52-a946-4663-993f-ad838cc62de9/resourceGroups/rg-arb-b36ffe2259e1a7c348a5bda1f0bbb74dcd56f270/providers/Microsoft.ServiceBus/namespaces/sbn-52qfhgssyyol6/topics/batch-v1-topic/explorer)

```mermaid
sequenceDiagram
  participant sap as SAP
  participant sap-integration-azure-infrastructure as SAPBatchEventHubConsumer <br>(Azure Function App)
  participant sapTopic as batch-v1-topic<br/>(Service Bus Topic)
  participant blobContainer as message-archive<br/>(Blob Container)
  sap ->>+ sap-integration-azure-infrastructure: Batch message<br/>(SAP format)
  sap-integration-azure-infrastructure ->> blobContainer: Upload incoming Batch message
  sap-integration-azure-infrastructure ->> sap: Request additional fields
  sap -->> sap-integration-azure-infrastructure: Return additional fields
  sap-integration-azure-infrastructure ->> sapTopic: Batch message<br/>(Enriched SAP format)
  sap-integration-azure-infrastructure ->> blobContainer: Upload Batch message (Enriched)