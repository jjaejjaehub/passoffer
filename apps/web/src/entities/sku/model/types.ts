export type SkuTaxType = "GENERAL" | "ZERO" | "EXEMPT";

export interface SkuPlayautoFields {
  // 기본정보
  warehouseText?: string | null;
  isPrimaryWarehouse?: boolean;
  vendorText?: string | null;
  leadTimeDays?: number | null;
  safetyStock?: number;
  modelName?: string | null;
  inventoryCode?: string | null;
  image?: string | null;
  standardCode?: string | null;
  hsCode?: string | null;
  isbn?: string | null;
  // 규격/가격
  isBundlable?: boolean;
  widthCm?: string | null;
  heightCm?: string | null;
  depthCm?: string | null;
  weightKg?: string | null;
  inboundUnit?: string | null;
  inboundUnitType?: string | null;
  purchaseCost?: string;
  purchaseFreight?: string;
  deliveryFee?: string;
  adCost?: string;
  etcCost?: string;
  supplyPrice?: string | null;
  salePrice?: string | null;
  currency?: string;
  // 추가정보
  originCountry?: string | null;
  originExtras?: Array<Record<string, unknown>>;
  requiresCaution?: boolean;
  taxType?: SkuTaxType;
  brand?: string | null;
  manufacturer?: string | null;
  manufacturerEn?: string | null;
  ageGroup?: string | null;
  infoNotice?: Record<string, unknown>;
  mainImage?: string | null;
  descriptionHtml?: string | null;
}

export interface Sku extends SkuPlayautoFields {
  id: string;
  userId: string;
  code: string;
  name: string | null;
  stock: number;
  barcode: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  masterVariantCount: number;
  listedSkuCount: number;
}

export interface SkuMasterVariantMapping {
  masterVariantId: string;
  qty: number;
  position: number;
  masterProductId: string;
  masterProductTitle: string;
  variantSku: string;
}

export interface SkuListedMapping {
  listedProductId: string;
  channelVariantId: string;
  channelSellerCode: string | null;
  qty: number;
}

export interface SkuDetail
  extends Omit<Sku, "masterVariantCount" | "listedSkuCount"> {
  masterVariants: SkuMasterVariantMapping[];
  listedSkus: SkuListedMapping[];
}

export interface SkusResponse {
  items: Sku[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListedProductSkuMapping {
  id: string;
  channelVariantId: string;
  channelSellerCode: string | null;
  skuId: string;
  skuCode: string;
  skuName: string | null;
  skuStock: number;
  qty: number;
  createdAt: string;
}
