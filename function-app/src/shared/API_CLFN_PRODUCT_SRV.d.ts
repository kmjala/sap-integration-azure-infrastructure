/**
 * Types of the API_CLFN_PRODUCT_SRV API service.
 *
 * https://api.sap.com/api/OP_API_CLFN_PRODUCT_SRV/resource/Product
 */

import { Metadata } from "./SAPAPIService.d";

/**
 * API_CLFN_PRODUCT_SRV.A_ClfnProductType
 */
export type A_ClfnProductType = {
  BaseUnit: string;
  to_Plant: {
    results: A_ProductPlantType[];
  };
  to_Description: {
    results: A_ProductDescriptionType[];
  };
  to_ProductClass: {
    results: A_ProductClassType[];
  };
};

/**
 * API_CLFN_PRODUCT_SRV.A_ProductDescriptionType
 */
export type A_ProductDescriptionType = {
  __metadata: Metadata;
  Product: string;
  Language: string;
  ProductDescription: string;
};

/**
 * API_CLFN_PRODUCT_SRV.A_ProductPlantType
 */
export type A_ProductPlantType = {
  Plant: string;
  CountryOfOrigin: string;
  GoodsReceiptDuration: string;
  ProcurementType: string;
  ProfileCode: string;
};

/**
 * API_CLFN_PRODUCT_SRV.A_ProductClassType
 */
export type A_ProductClassType = {
  __metadata: Metadata;
  ClassInternalID: string;
  ClassType: string;
  to_Characteristics: {
    results: A_ProductClassCharcType[];
  };
  to_ClassDetails: A_ClfnClassForKeyDateType;
};

/**
 * API_CLFN_PRODUCT_SRV.A_ProductClassCharcType
 */
export type A_ProductClassCharcType = {
  __metadata: Metadata;
  Product: string;
  ClassInternalID: string;
  CharcInternalID: string;
  KeyDate: string;
  ChangeNumber: string;
  ClassType: string;
  to_Valuation: {
    results: A_ProductCharcValueType[];
  };
};

/**
 * API_CLFN_PRODUCT_SRV.A_ProductCharcValueType
 */
export type A_ProductCharcValueType = {
  __metadata: Metadata;
  CharcInternalID: string;
  CharcValue: string;
};

/**
 * API_CLFN_PRODUCT_SRV.A_ClfnClassForKeyDateType
 */
export type A_ClfnClassForKeyDateType = {
  __metadata: Metadata;
  ClassInternalID: string;
  ClassTypeName: string;
  ClassType: string;
};
