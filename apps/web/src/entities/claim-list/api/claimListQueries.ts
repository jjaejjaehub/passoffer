"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { http } from "@/shared/api";
import type { OrderListItem, OrderDateField } from "@/entities/order/model/types";

export type ClaimSortField =
  | "orderedAt"
  | "paidAt"
  | "shippedAt"
  | "claimStatus"
  | "total"
  | "channelOrderId"
  | "createdAt"
  | "updatedAt";

export interface ClaimListParams {
  claimStatus?: string[];
  dateField?: OrderDateField;
  dateFrom?: string;
  dateTo?: string;
  channelId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: ClaimSortField;
  sortDir?: "asc" | "desc";
}

export interface ClaimListResponse {
  items: OrderListItem[];
  total: number;
  counts: Record<string, number>;
}

export const claimListQueries = {
  all: () => ["claim-list"] as const,
  list: (params: ClaimListParams) => [...claimListQueries.all(), "list", params] as const,
};

function buildParams(params: ClaimListParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.claimStatus && params.claimStatus.length > 0)
    out.claimStatus = params.claimStatus.join(",");
  if (params.dateField) out.dateField = params.dateField;
  if (params.dateFrom) out.dateFrom = params.dateFrom;
  if (params.dateTo) out.dateTo = params.dateTo;
  if (params.channelId) out.channelId = params.channelId;
  if (params.page) out.page = String(params.page);
  if (params.pageSize) out.pageSize = String(params.pageSize);
  if (params.sortBy) out.sortBy = params.sortBy;
  if (params.sortDir) out.sortDir = params.sortDir;
  return out;
}

export function useClaimList(params: ClaimListParams) {
  const query = useQuery({
    queryKey: claimListQueries.list(params),
    queryFn: () =>
      http.get<ClaimListResponse>("/api/claims/list", { params: buildParams(params) }),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  return {
    items: (query.data?.items ?? []) as OrderListItem[],
    total: query.data?.total ?? 0,
    counts: query.data?.counts ?? {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
