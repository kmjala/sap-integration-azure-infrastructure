import { A_ClfnProductType } from "./API_CLFN_PRODUCT_SRV";

export type SAPAPIErrorResponse = {
  error: {
    code: string;
    message: {
      lang: string;
      value: string;
    }[];
    innererror: {
      application: {
        component_id: string;
        service_namespace: string;
        service_id: string;
        service_version: string;
      };
      transactionid: string;
      timestamp: string;
      Error_Resolution: {
        SAP_Transaction: string;
        SAP_Note: string;
      };
      errordetails: [];
    };
  };
};

export type ProductMasterIDoc = {
  ZMATMAS0601: {
    IDOC: {
      E1MARAM: {
        MATNR: string;
      };
    };
  };
};

// Product Master
export type ProductMasterResponse = {
  d: A_ClfnProductType;
};

export type Metadata = {
  __metadata: {
    id: string;
    uri: string;
    type: string;
  };
};

// Characteristics Description
export type CharcDescriptionResponse = {
  d: {
    CharcInternalID: string;
    CharcDescription: string;
  };
};

export type ProductionOrderEvent = {
  type: string;
  specversion: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: string;
  data: {
    ProductionOrder: string;
    ManufacturingOrder: string;
    ProductionOrderType: string;
    ProductionPlant: string;
  };
};

// Production Order
export type ProductionOrderResponse = {
  d: {
    MfgOrderCreationDate: string;
    MfgOrderCreationTime: string;
    MfgOrderScheduledEndDate: string;
    MfgOrderScheduledEndTime: string;
    LastChangeDateTime: string;
    MfgOrderPlannedStartDate: string;
    MfgOrderPlannedStartTime: string;
    MfgOrderPlannedEndDate: string;
    MfgOrderPlannedEndTime: string;
    MfgOrderScheduledStartDate: string;
    MfgOrderScheduledStartTime: string;
    MfgOrderActualReleaseDate: string;
    to_ProductionOrderComponent: ProductionOrderComponentResponse;
    to_ProductionOrderItem: ProductionOrderItemResponse;
    to_ProductionOrderOperation: ProductionOrderOperationResponse;
    to_ProductionOrderStatus: ProductionOrderStatusResponse;
  };
};

// Production Order Component
export type ProductionOrderComponentResponse = {
  results: {
    MatlCompRequirementDate: string;
    MatlCompRequirementTime: string;
  }[];
};

// Production Order Item
export type ProductionOrderItemResponse = {
  results: {
    MfgOrderItemPlndDeliveryDate: string;
    MfgOrderItemActualDeliveryDate: string;
  }[];
};

// Production Order Component
export type ProductionOrderOperationResponse = {
  results: {
    OpErlstSchedldExecStrtDte: string;
    OpErlstSchedldExecStrtTme: string;
    OpErlstSchedldExecEndDte: string;
    OpErlstSchedldExecEndTme: string;
    OpActualExecutionStartDate: string;
    OpActualExecutionStartTime: string;
    OpActualExecutionEndDate: string;
    OpActualExecutionEndTime: string;
    OpErlstSchedldProcgStrtDte: string;
    OpErlstSchedldProcgStrtTme: string;
    OpErlstSchedldTrdwnStrtDte: string;
    OpErlstSchedldTrdwnStrtTme: string;
    LastChangeDateTime: string;
  }[];
};

// Production Order Status
export type ProductionOrderStatusResponse = {
  results: {
    ManufacturingOrder: string;
    StatusCode: string;
    IsUserStatus: string;
    StatusShortName: string;
    StatusName: string;
  }[];
};

export type InspectionLotEvent = {
  type: string;
  specversion: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: string;
  data: {
    InspectionLot: string;
    Plant: string;
  };
};

// Inspection Lot
export type InspectionLotResponse = {
  d: {
    InspectionLot: string;
    Material: string;
    Batch: string;
    to_InspectionLotWithStatus: InspectionLotStatusResponse;
  };
};

export type InspectionLotStatusResponse = {
  d: {
    InspectionLot: string;
  };
};

// Batch
export type BatchResponse = {
  d: {
    Batch: string;
    to_BatchCharc: BatchCharcResponse;
  };
};

// Batch Characteristics
export type BatchCharcResponse = {
  results: {
    Material: string;
    CharcInternalID: string;
  }[];
};

// Batch Characteristic Value
export type BatchCharcValueResponse = {
  d: {
    results: {
      CharcInternalID: string;
      CharcValue: string;
    }[];
  };
};

export type COADeliveryDocumentEvent = {
  type: string;
  specversion: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: string;
  data: {
    FO: string;
  };
};

export type WarehouseAvailableStockResponse = {
  EWMWarehouse: string;
  Product: string;
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
