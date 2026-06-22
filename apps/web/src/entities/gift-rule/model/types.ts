export type GiftConditionType = "sku" | "category" | "amount" | "qty" | "all";
export type GiftDistributionMode = "auto" | "manual";
export type GiftCurrency =
  | "KRW"
  | "JPY"
  | "USD"
  | "EUR"
  | "GBP"
  | "CNY"
  | "TWD"
  | "HKD"
  | "SGD"
  | "AUD"
  | "CAD"
  | "THB";

export const GIFT_CURRENCIES: readonly GiftCurrency[] = [
  "KRW",
  "JPY",
  "USD",
  "EUR",
  "GBP",
  "CNY",
  "TWD",
  "HKD",
  "SGD",
  "AUD",
  "CAD",
  "THB",
];

export interface GiftRuleChannelFilter {
  channelIds?: string[];
}

export interface GiftRuleConditionPayload {
  skuIds?: string[];
  categoryIds?: string[];
}

export interface GiftRule {
  id: string;
  userId: string;
  name: string;
  distributionMode: GiftDistributionMode;
  channelFilter: GiftRuleChannelFilter | null;
  conditionType: GiftConditionType;
  conditionCurrency: GiftCurrency | null;
  conditionMinAmount: string | number | null;
  conditionMinQty: number | null;
  conditionPayload: GiftRuleConditionPayload;
  giftSkuId: string;
  giftSkuCode: string | null;
  giftSkuName: string | null;
  giftQty: number;
  maxApplyCount: number | null;
  appliedCount: number;
  priority: number;
  isActive: boolean;
  activeFrom: string | null;
  activeTo: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GiftRulesResponse {
  items: GiftRule[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GiftRuleListFilters {
  distributionMode?: GiftDistributionMode;
  conditionType?: GiftConditionType;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface GiftRuleCreateInput {
  name: string;
  distributionMode?: GiftDistributionMode;
  channelFilter?: GiftRuleChannelFilter | null;
  conditionType: GiftConditionType;
  conditionCurrency?: GiftCurrency | null;
  conditionMinAmount?: number | null;
  conditionMinQty?: number | null;
  conditionPayload?: GiftRuleConditionPayload;
  giftSkuId: string;
  giftQty?: number;
  maxApplyCount?: number | null;
  priority?: number;
  isActive?: boolean;
  activeFrom?: string | Date | null;
  activeTo?: string | Date | null;
  note?: string | null;
}

export type GiftRuleUpdateInput = Partial<GiftRuleCreateInput>;

export interface GiftDistributeResult {
  appliedOrders: number;
  totalGifts: number;
}
