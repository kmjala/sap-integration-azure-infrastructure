# Infrastructure

This file describes how the different Bicep files relate to each other to deploy the infrastructure of this repository.

- [main.bicep](../main.bicep) is the main Bicep file referenced in the GitHub workflows to deploy the entire infrastructure. It references other Bicep files in the [`bicep` folder](.).
- [bicep/function-app.bicep](function-app.bicep) creates the [Azure Function App](../function-app/) of this repository.
- [bicep/storage-account.bicep](storage-account.bicep) creates the Storage Account used to store payloads, e.g. incoming and outgoing messages for debugging purposes.
- [bicep/log-analytics.bicep](log-analytics.bicep) creates the Log Analytics workspace and Application Insights, e.g. to store logs and monitor metrics.
- [bicep/event-hub.bicep](event-hub.bicep) creates the Event Hub where SAP publishes events to that the Function App then consumes.
- [bicep/service-bus/main.bicep](service-bus/enrichment-topic.bicep) deploys all Service Bus related resources, more details are below.

```mermaid
flowchart LR
  subgraph main.bicep
    functionApp
    storageAccount
    logAnalytics
    serviceBus
    eventHub
    functionAppIdentity
  end

  subgraph function-app.bicep
    functionAppResource[Function App]
    hostingPlan[Hosting Plan]
    functionAppStorageAccount["Storage Account
(Function code, etc.)"]
  end
  functionApp --> function-app.bicep

  subgraph storage-account.bicep
    storageAccountResource[Storage Account]
    blobService[Blob Service]
    container["Container 'Message Archive'"]
    storageAccountResource --> blobService --> container
  end
  storageAccount --> storage-account.bicep

  subgraph service-bus/main.bicep
    serviceBusNamespace["(See below)"]
  end
  serviceBus --> service-bus/main.bicep

  subgraph event-hub.bicep
    eventHubNamespace[Event Hub Namespace]
    productionOrderEventHub[Production Order]
    placeholderEventHub["(...)"]
    eventHubNamespace --> productionOrderEventHub
    eventHubNamespace --> placeholderEventHub
  end
  eventHub --> event-hub.bicep

  subgraph log-analytics.bicep
    logAnalyticsWorkspace[Log Analytics Workspace]
    applicationInsights[Application Insights]
  end
  logAnalytics --> log-analytics.bicep

  subgraph function-app-identity.bicep
    managedIdentity[Managed Identity]
  end
  functionAppIdentity --> function-app-identity.bicep
```

The [`bicep/service-bus`](service-bus/) folder contains the following files:

- [`main.bicep`](service-bus/main.bicep) is referenced by the repository root's [`main.bicep`](../main.bicep) (see above) and creates the Service Bus and related infrastructure by referencing `topics.bicep` and `subscriptions.bicep`.
- [`subscriptions.bicep`](service-bus/subscriptions.bicep) references the `subscription-*.bicep` files to create all subscriptions.
- `subscriptions-<consumer>.bicep` uses [`subscription.bicep`](service-bus/subscription.bicep) to create all subscriptions for a consumer.
- [`subscription.bicep`](service-bus/subscription.bicep) creates a subscription for a topic and the permissions for the consumer to receive messages from it.
- [`subscriptions-coa.bicep`](service-bus/subscriptions-coa.bicep) uses [`subscription.bicep`](service-bus/subscription.bicep) to create all subscriptions for the COA app.
- [`subscriptions-compass.bicep`](service-bus/subscriptions-compass.bicep) uses [`subscription.bicep`](service-bus/subscription.bicep) to create all subscriptions for the [Compass integration](https://github.com/goreperformancesolution/sap-compass-azure-integration).
- [`subscriptions-function-app.bicep`](service-bus/subscriptions-function-app.bicep) uses [`subscription.bicep`](service-bus/subscription.bicep) to create all subscriptions for the Function App of this repository.
- [`subscriptions-nemo01.bicep`](service-bus/subscriptions-nemo01.bicep) uses [`subscription.bicep`](service-bus/subscription.bicep) to create all subscriptions for the [Nemo01 integration](https://github.com/goreperformancesolution/sap-nemo01-azure-integration).
- [`topics.bicep`](service-bus/topics.bicep) creates all Service Bus topics by referencing [`enrichment-topic.bicep`](service-bus/enrichment-topic.bicep) and [`sap-topic.bicep`](service-bus/sap-topic.bicep).
- [`enrichment-topic.bicep`](service-bus/enrichment-topic.bicep) creates a single topic that the Function App can publish to.
- [`sap-topic.bicep`](service-bus/sap-topic.bicep) creates a single topic that SAP can publish to.

```mermaid
flowchart
  subgraph service-bus/main.bicep
    topics
    serviceBusNamespace[Service Bus Namespace]
    subscriptions
  end

  %% Topics

  subgraph topics.bicep
    material-master-idoc
    sapPlaceholderTopic["(...)"]
    material-master-v1-topic
    enrichmentPlaceholderTopic["(...)"]

  end
  topics --> topics.bicep

  subgraph enrichtment-topic.bicep
    enrichtmentTopic[Topic]
    enrichmentRoleAssignment[Role Assignment]
  end
  material-master-v1-topic --> enrichtment-topic.bicep
  enrichmentPlaceholderTopic --> enrichtment-topic.bicep

  subgraph sap-topic.bicep
    sapTopic[Topic]
    sapRoleAssignment[Role Assignment]
  end
  material-master-idoc --> sap-topic.bicep
  sapPlaceholderTopic --> sap-topic.bicep

  %% Subscriptions

  subgraph subscriptions.bicep
    functionAppSubscriptions
    placeholderSubscriptions["(...)"]
  end
  subscriptions --> subscriptions.bicep

  subgraph subscriptions-function-app.bicep
    functionAppPlaceholderSubscription["(...)"]
  end
  functionAppSubscriptions --> subscriptions-function-app.bicep

  subgraph subscriptions-*.bicep
    placeholderSubscription["(...)"]
  end
  placeholderSubscriptions --> subscriptions-*.bicep

  subgraph subscription.bicep
    Subscription
    subscriptionRoleAssignment[Role Assignment]
  end
  functionAppPlaceholderSubscription --> subscription.bicep
  placeholderSubscription --> subscription.bicep
```
