"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type {
  GiftRule,
  GiftRuleListFilters,
  GiftRulesResponse,
} from "../model/types";

export const giftRulesQueryRoot = ["gift-rules"] as const;

export const giftRuleQueries = {
  all: () => giftRulesQueryRoot,
  list: (params: GiftRuleListFilters) =>
    [...giftRulesQueryRoot, "list", params] as const,
  detail: (id: string) => [...giftRulesQueryRoot, "detail", id] as const,
};

export function useGiftRules(
  opts: GiftRuleListFilters & { enabled?: boolean } = {},
) {
  const {
    distributionMode,
    conditionType,
    isActive,
    search,
    page = 1,
    pageSize = 50,
    enabled = true,
  } = opts;

  return useQuery({
    queryKey: giftRuleQueries.list({
      distributionMode,
      conditionType,
      isActive,
      search,
      page,
      pageSize,
    }),
    queryFn: async (): Promise<GiftRulesResponse> => {
      const params = new URLSearchParams();
      if (distributionMode) params.set("distributionMode", distributionMode);
      if (conditionType) params.set("conditionType", conditionType);
      if (typeof isActive === "boolean")
        params.set("isActive", String(isActive));
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return http.get<GiftRulesResponse>(
        `/api/gift-rules?${params.toString()}`,
      );
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useGiftRule(id: string | null) {
  return useQuery({
    queryKey: giftRuleQueries.detail(id ?? ""),
    queryFn: async (): Promise<GiftRule> =>
      http.get<GiftRule>(`/api/gift-rules/${id}`),
    enabled: !!id,
  });
}
