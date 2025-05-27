/**
 * This file contains Function App lifecycle hooks and/or registers Functions
 * that do not tied to a specific SAP-MES integration.
 */

import * as appInsights from "applicationinsights";

// configure Application Insights
appInsights
  .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true, false)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectConsole(true, true)
  .setAutoCollectPreAggregatedMetrics(true)
  .setSendLiveMetrics(true)
  .setInternalLogging(true, true)
  .enableWebInstrumentation(false)
  .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
  .start();

console.log("Application Insights initialized");

import { app } from "@azure/functions";
import { closeServiceBusClient } from "../shared/service-bus-client";
import { throwErrorIfSAPVariablesAreNotSet } from "../shared/env-check";
app.hook.appTerminate(closeServiceBusClient);
app.hook.appStart(throwErrorIfSAPVariablesAreNotSet);
