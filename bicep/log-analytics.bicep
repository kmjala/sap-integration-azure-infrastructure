param location string = resourceGroup().location

output applicationInsightsName string = applicationInsights.name

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.operationalinsights/workspaces?pivots=deployment-language-bicep
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${uniqueString(resourceGroup().id)}'
  location: location
  tags: resourceGroup().tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 60
  }
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'ai-${uniqueString(resourceGroup().id)}'
  location: location
  tags: resourceGroup().tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    RetentionInDays: 60
  }
}

// ----------------------------------------------------------------------------
// Query Pack and saved queries

// See https://learn.microsoft.com/en-us/azure/templates/microsoft.operationalinsights/querypacks?pivots=deployment-language-bicep
resource queryPack 'Microsoft.OperationalInsights/queryPacks@2019-09-01' = {
  name: 'sap-azure-query-pack'
  location: location
  tags: resourceGroup().tags
  properties: {}
}

resource queryResource 'Microsoft.OperationalInsights/queryPacks/queries@2019-09-01' = {
  name: guid(resourceGroup().id, 'all-integration-logs.kql')
  parent: queryPack
  properties: {
    body: loadTextContent('./queries/all-integration-logs.kql')
    description: 'All logs from the SAP Azure Integration Insfrastucturen'
    displayName: 'SAP Azure Integration Insfrastucture Logs'
    related: {
      categories: ['Applications']
      resourceTypes: ['microsoft.operationalinsights/workspaces']
      solutions: ['LogManagement']
    }
    tags: resourceGroup().tags
  }
}
