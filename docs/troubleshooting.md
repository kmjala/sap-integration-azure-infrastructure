# Troubleshooting

## Prerequisites

### Access to the infrastructure

In case you need to resubmit the message(s) via Azure, you'll need the Reader role and Service Bus Sender role and the access to the following resource group(s) depending on the environment in which you want to resubmit the message(s):

- [Resource Group](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/e2fda199-cfde-4565-9bb3-08b676d05cc2/resourceGroups/rg-arb-8f9b03a7c50e787f9a6a332d6d10a85723251c54/overview) (DEV)
- [Resource Group](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/d5c0187e-4b27-48b7-8592-f28f897fed9c/resourceGroups/rg-arb-a915fcf60a914831589e4348f82b54b263257fe4/overview) (VAL)
- [Resource Group](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/dc554c52-a946-4663-993f-ad838cc62de9/resourceGroups/rg-arb-b36ffe2259e1a7c348a5bda1f0bbb74dcd56f270/overview) (PRD)

You can request access using this [ServiceNow request](https://gore.service-now.com/nav_to.do?uri=%2Fcom.glideapp.servicecatalog_cat_item_view.do%3Fv%3D1%26sysparm_id%3D3c49d4e51be93150973dfd115b4bcbf6%26sysparm_link_parent%3De6fe2e851b8fbc103457caae6e4bcb39%26sysparm_catalog%3De0d08b13c3330100c8b837659bba8fb4%26sysparm_catalog_view%3Dcatalog_default%26sysparm_view%3Dtext_search).

## SAP API circuit breaker error resolution

The following errors all result from the SAP API backend being overwhelmed:

1. Unable to open connection to backend system
2. Connection to the backend is timeout. Gateway Timeout Error
3. Circuit Breaker is enabled as backend is unhealthy

In this case, the messages that are sent SAP to the Azure layer will fail and land in the Dead Letter Queue (DLQ).

*If the message can be re-sent from SAP*, re-send the same message by repeating the transaction that you performed in SAP and that will re-process the failed message. If the it fails again, wait until the SAP is reachable to retry.

*If the message can not be re-sent from SAP*, then resolve this issue by re-sending the failed message from the DLQ:

1. Assert that there is no SAP downtime.
2. Navigate to the Service Bus topic.
   - [Service Bus &rarr; Topics](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/e2fda199-cfde-4565-9bb3-08b676d05cc2/resourceGroups/rg-arb-8f9b03a7c50e787f9a6a332d6d10a85723251c54/providers/Microsoft.ServiceBus/namespaces/sbn-uudmmlrz377qq/topics) (DEV)
   - [Service Bus &rarr; Topics](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/d5c0187e-4b27-48b7-8592-f28f897fed9c/resourceGroups/rg-arb-a915fcf60a914831589e4348f82b54b263257fe4/providers/Microsoft.ServiceBus/namespaces/sbn-3usitng2rgrns/topics) (VAL)
   - [Service Bus &rarr; Topics](https://portal.azure.com/#@wlgore.onmicrosoft.com/resource/subscriptions/dc554c52-a946-4663-993f-ad838cc62de9/resourceGroups/rg-arb-b36ffe2259e1a7c348a5bda1f0bbb74dcd56f270/providers/Microsoft.ServiceBus/namespaces/sbn-52qfhgssyyol6/topics) (PRD)
3. Select the topic corresponding to the Function that failed.
4. Go to *Subscriptions* and select the one corresponding to the Function that failed.
5. Go to *Service Bus Explorer* and select the *Dead-letter* tab,
6. Change from *Peek Mode* to *Receive Mode*.
7. Click *Receive messages* and adjust *Number of messages to receive* to a higher number to ensure that you will see the message that failed.

   **IMPORTANT:** Be sure to leave *PeekLock* checked, do not select *ReceiveAndDelete*.

8. Select the message that you want to resubmit, e.g. comparing the logs with the *Message ID* or *Enqueued Time*.
9. Click *Re-send selected message*.
10. After it was re-sent, click on *Complete* to remove this message from the DLQ.

The message will now be re-processed. If it fails again, it will show up again in the DLQ from where you can re-send it again once SAP is reachable again.
