"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { http } from "@/shared/api";

export type ClaimSummary = {
  cancel: number;
  return: number;
  exchange: number;
  swap: number;
  total: number;
};

export type ClaimSummaryParams = {
  dateField?: "orderedAt" | "paidAt" | "shippedAt";
  dateFrom?: string;
  dateTo?: string;
  channelId?: string;
};

export type ClaimSummaryResponse = {
  summary: ClaimSummary;
};

export const EMPTY_CLAIM_SUMMARY: ClaimSummary = {
  cancel: 0,
  return: 0,
  exchange: 0,
  swap: 0,
  total: 0,
};

export const claimsSummaryQueries = {
  all: () => ["claims-summary"] as const,
  summary: (params: ClaimSummaryParams) =>
    [...claimsSummaryQueries.all(), "summary", params] as const,
};

function buildParams(params: ClaimSummaryParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.dateField) out.dateField = params.dateField;
  if (params.dateFrom) out.dateFrom = params.dateFrom;
  if (params.dateTo) out.dateTo = params.dateTo;
  if (params.channelId) out.channelId = params.channelId;
  return out;
}

export function useClaimsSummary(params: ClaimSummaryParams) {
  const query = useQuery({
    queryKey: claimsSummaryQueries.summary(params),
    queryFn: () =>
      http.get<ClaimSummaryResponse>("/api/claims-summary", {
        params: buildParams(params),
      }),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  return {
    summary: query.data?.summary ?? EMPTY_CLAIM_SUMMARY,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
