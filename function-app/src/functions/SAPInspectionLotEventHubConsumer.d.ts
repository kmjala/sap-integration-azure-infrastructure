// Inspection Lot
export type InspectionLotResult = {
  InspectionLot: string;
  Material: string;
  Batch: string | BatchResult;
  InspectionLotStatus: {
    InspectionLot: string;
  };
};

// Batch
export type BatchResult = {
  Batch: string;
  BatchCharc: BatchCharcResult[];
};

// Batch Characteristic
export type BatchCharcResult = {
  Description: {
    CharcDescription: string;
  };
  Valuation: {
    Material: string;
    BatchIdentifyingPlant: string;
    Batch: string;
    CharcInternalID: string;
  };
};
