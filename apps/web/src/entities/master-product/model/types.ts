export interface MasterProduct {
  id: string;
  code: string;
  title: string;
  brand?: string;
  hsCode?: string;
  countryOfOrigin?: string;
  material?: string;
  weightG?: number;
  retailPrice?: string;
  descriptionHtml?: string;
  images: Array<{ url: string; altText?: string; order?: number }>;
  tags: string[];
  attributes: Record<string, unknown>;
  variantCount: number;
  listedChannelCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MasterProductVariant {
  id: string;
  masterProductId: string;
  sku: string;
  optionName?: string;
  optionValue?: string;
  price?: string;
  stock: number;
  extraAttributes: Record<string, unknown>;
}

export interface MasterProductDetail extends Omit<MasterProduct, 'variantCount' | 'listedChannelCount'> {
  variants: MasterProductVariant[];
  listedProducts: Array<{
    id: string;
    channelId: string;
    channelItemCode?: string;
    title?: string;
    status?: string;
    syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
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
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
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
