export type Mode = "single" | "bulk";

export interface FormState {
  // 기본정보
  code: string;
  name: string;
  barcode: string;
  warehouseText: string;
  isPrimaryWarehouse: boolean;
  vendorText: string;
  leadTimeDays: string;
  safetyStock: string;
  modelName: string;
  inventoryCode: string;
  image: string;
  standardCode: string;
  hsCode: string;
  isbn: string;
  // 규격/가격
  isBundlable: boolean;
  widthCm: string;
  heightCm: string;
  depthCm: string;
  weightKg: string;
  inboundUnit: string;
  inboundUnitType: string;
  purchaseCost: string;
  purchaseFreight: string;
  deliveryFee: string;
  adCost: string;
  etcCost: string;
  supplyPrice: string;
  salePrice: string;
  currency: string;
  // 추가정보
  originCountry: string;
  requiresCaution: boolean;
  taxType: "GENERAL" | "ZERO" | "EXEMPT";
  brand: string;
  manufacturer: string;
  manufacturerEn: string;
  ageGroup: string;
  mainImage: string;
  descriptionHtml: string;
  // 메타
  initialStock: string;
  attributesJson: string;
}

export const defaultState: FormState = {
  code: "",
  name: "",
  barcode: "",
  warehouseText: "",
  isPrimaryWarehouse: false,
  vendorText: "",
  leadTimeDays: "",
  safetyStock: "0",
  modelName: "",
  inventoryCode: "",
  image: "",
  standardCode: "",
  hsCode: "",
  isbn: "",
  isBundlable: true,
  widthCm: "",
  heightCm: "",
  depthCm: "",
  weightKg: "",
  inboundUnit: "",
  inboundUnitType: "EA",
  purchaseCost: "0",
  purchaseFreight: "0",
  deliveryFee: "0",
  adCost: "0",
  etcCost: "0",
  supplyPrice: "",
  salePrice: "",
  currency: "KRW",
  originCountry: "",
  requiresCaution: false,
  taxType: "GENERAL",
  brand: "",
  manufacturer: "",
  manufacturerEn: "",
  ageGroup: "",
  mainImage: "",
  descriptionHtml: "",
  initialStock: "0",
  attributesJson: "",
};

export interface AxisRow {
  name: string;
  values: string;
}
