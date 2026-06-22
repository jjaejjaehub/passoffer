"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type {
  MatchRule,
  MatchRulesResponse,
  MatchRuleIfKey,
  MatchRuleResolution,
} from "../model/types";

export const matchingRulesQueryRoot = ["matching-rules"] as const;

export const matchingRuleQueries = {
  all: () => matchingRulesQueryRoot,
  list: (params: {
    channelId?: string;
    search?: string;
    isActive?: boolean;
    autoLearned?: boolean;
    page?: number;
    pageSize?: number;
  }) => [...matchingRulesQueryRoot, "list", params] as const,
  detail: (id: string) => [...matchingRulesQueryRoot, "detail", id] as const,
};

export function useMatchingRules(
  opts: {
    channelId?: string;
    search?: string;
    isActive?: boolean;
    autoLearned?: boolean;
    page?: number;
    pageSize?: number;
    enabled?: boolean;
  } = {},
) {
  const {
    channelId,
    search,
    isActive,
    autoLearned,
    page = 1,
    pageSize = 50,
    enabled = true,
  } = opts;

  return useQuery({
    queryKey: matchingRuleQueries.list({
      channelId,
      search,
      isActive,
      autoLearned,
      page,
      pageSize,
    }),
    queryFn: async (): Promise<MatchRulesResponse> => {
      const params = new URLSearchParams();
      if (channelId) params.set("channelId", channelId);
      if (search) params.set("search", search);
      if (typeof isActive === "boolean")
        params.set("isActive", String(isActive));
      if (typeof autoLearned === "boolean")
        params.set("autoLearned", String(autoLearned));
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return http.get<MatchRulesResponse>(
        `/api/matching-rules?${params.toString()}`,
      );
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useMatchingRule(id: string | null) {
  return useQuery({
    queryKey: matchingRuleQueries.detail(id ?? ""),
    queryFn: async (): Promise<MatchRule> =>
      http.get<MatchRule>(`/api/matching-rules/${id}`),
    enabled: !!id,
  });
}

export async function evaluateMatchingRule(
  key: MatchRuleIfKey,
): Promise<MatchRuleResolution | null> {
  const res = await http.post<{ result: MatchRuleResolution | null }>(
    "/api/matching-rules/evaluate",
    key,
  );
  return res.result;
}
