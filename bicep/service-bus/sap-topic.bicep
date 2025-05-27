// Creates a Service Bus topic for SAP to publish messages to.

param serviceBusNamespaceName string
param topicName string

output topicName string = serviceBusNamespace::topic.name

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' existing = {
  name: serviceBusNamespaceName

  // Create a topic for SAP to publish messages to
  resource topic 'topics' = {
    name: topicName
    properties: {}

    // Create a rule that allows SAP to send messages to the topic
    resource sapAuthorizationRule 'authorizationRules' = {
      name: 'sap-send-rule'
      properties: {
        rights: [
          'Send'
        ]
      }
    }
  }
}
