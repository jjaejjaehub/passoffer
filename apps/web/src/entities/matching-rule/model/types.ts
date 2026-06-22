export interface MatchRule {
  id: string;
  userId: string;
  channelId: string;
  channelItemCode: string;
  channelItemTitle: string | null;
  optionCode: string | null;
  optionName: string | null;
  skuId: string;
  skuCode: string | null;
  skuName: string | null;
  outputQty: number;
  warehouseId: string | null;
  priority: number;
  isActive: boolean;
  autoLearned: boolean;
  matchHitCount: number;
  lastMatchedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchRulesResponse {
  items: MatchRule[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MatchRuleIfKey {
  channelId: string;
  channelItemCode: string;
  channelItemTitle?: string | null;
  optionCode?: string | null;
  optionName?: string | null;
}

export interface MatchRuleResolution {
  ruleId: string;
  skuId: string;
  skuCode: string | null;
  skuName: string | null;
  outputQty: number;
  warehouseId: string | null;
}
