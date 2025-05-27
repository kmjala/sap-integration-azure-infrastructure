import {
  A_ClfnClassForKeyDateType,
  A_ProductCharcValueType,
  A_ProductDescriptionType,
  A_ProductPlantType,
} from "../shared/API_CLFN_PRODUCT_SRV.d";

export type MaterialMasterV1 = {
  Product: string;
  BaseUnit: string;
  BaseUnitISOCode: string;
  ProductDescription: A_ProductDescriptionType[];
  PlantData: A_ProductPlantType[];
  ProductClass: {
    ClassDetails: A_ClfnClassForKeyDateType;
    ProductClassCharc: {
      Description: A_ProductDescriptionType;
      Valuation: A_ProductCharcValueType[];
    }[];
  }[];
};
