export type ListedProductSyncStatus = "SYNCED" | "PENDING" | "ERROR";

export interface MasterProduct {
  id: string;
  code: string;
  title: string;
  attributes: Record<string, unknown>;
  variantCount: number;
  listedChannelCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MasterProductVariantOption {
  groupId: string;
  groupName: string;
  groupPosition: number;
  optionValueId: string;
  value: string;
  valuePosition: number;
}

export interface MasterProductVariantAttachedSku {
  skuId: string;
  code: string;
  qty: number;
  position: number;
  stock: number;
}

export interface MasterProductVariant {
  id: string;
  masterProductId: string;
  price?: string;
  stock: number;
  extraAttributes: Record<string, unknown>;
  options: MasterProductVariantOption[];
  optionLabel: string;
  attachedSkus: MasterProductVariantAttachedSku[];
}

export interface MasterProductOptionGroup {
  id: string;
  name: string;
  position: number;
  values: Array<{ id: string; value: string; position: number }>;
}

export interface MasterProductDetail
  extends Omit<MasterProduct, "variantCount" | "listedChannelCount"> {
  variants: MasterProductVariant[];
  optionGroups: MasterProductOptionGroup[];
  listedProducts: Array<{
    id: string;
    channelId: string;
    channelItemCode?: string;
    title?: string;
    status?: string;
    syncStatus: ListedProductSyncStatus;
    syncError?: string | null;
    lastSyncedAt?: string;
    channelType: string;
    channelName: string;
  }>;
}

export interface ListedProduct {
  id: string;
  masterProductId?: string;
  channelId: string;
  channelItemCode?: string;
  title?: string;
  status?: string;
  syncStatus: ListedProductSyncStatus;
  syncError?: string | null;
  lastSyncedAt?: string;
  createdAt: string;
  channelType: string;
  channelName: string;
}

export interface ListedProductDetail extends ListedProduct {
  channelSellerCode?: string;
  channelData?: Record<string, unknown>;
  updatedAt: string;
}

export interface MasterProductsResponse {
  items: MasterProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListedProductsResponse {
  items: ListedProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
