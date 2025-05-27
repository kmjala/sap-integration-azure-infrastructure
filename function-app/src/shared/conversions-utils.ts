import csv from "csvtojson";
const uomTranslationFilePath = "./src/conversions/uom.csv";

const SAP_TO_ISO_UOM_TRANSLATIONS = new Map<string, string>();

async function loadUOMTranslations() {
  const jsonArray = await csv().fromFile(uomTranslationFilePath);
  jsonArray.forEach((element) => {
    SAP_TO_ISO_UOM_TRANSLATIONS.set(element.SAP, element.ISO);
  });
  return jsonArray;
}

export async function getISOUOMTranslation(sapUOM: string) {
  if (SAP_TO_ISO_UOM_TRANSLATIONS.size == 0) {
    await loadUOMTranslations();
  }
  return SAP_TO_ISO_UOM_TRANSLATIONS.get(sapUOM);
}
