export type InventoryLocationMoveResult = {
  EWMWarehouse: string;
  Product: string | ProductMasterResult;
  Batch: string;
  EWMStockOwner: string;
  EntitledToDisposeParty: string;
  EWMStockType: string;
  EWMStockUsage: string;
  StockDocumentCategory: string;
  EWMDocumentCategory: string;
  WBSElementExternalID: string;
  SpecialStockIdfgSalesOrder: string;
  SpecialStockIdfgSalesOrderItem: string;
  HandlingUnitExternalID: string;
  EWMStorageBin: string;
  EWMResource: string;
  TranspUnitInternalNumber: string;
  WBSElementInternalID: string;
  EWMStorageType: string;
  AvailableEWMStockQty: number;
  EWMStockQuantityBaseUnit: string;
  EWMStockQtyBaseUnitISOCode: string;
  StockKeepingAlternativeUoM: string;
  StockKeepingAltvUnitISOCode: string;
  GoodsReceiptUTCDateTime: string;
  ShelfLifeExpirationDat: string;
  EWMStockIsBlockedForInventory: boolean;
  EWMBatchIsInRestrictedUseStock: boolean;
  CountryOfOrigin: string;
  EWMHUHasOpenWarehouseTask: boolean;
  WhseQualityInspectionType: string;
  QualityInspectionDocument: string;
  ParentHandlingUnitUUID: string;
  StockItemUUID: string;
};

export type ProductMasterResult = {
  Product: string;
  ProductClass: {
    ClassInternalID: string;
    ClassDetails: {
      ClassInternalID: string;
    };
    ProductClassCharc: {
      Description: {
        CharcInternalID: string;
        CharcDescription: string;
      };
      Valuation: {
        CharcInternalID: string;
      }[];
    }[];
  }[];
};
