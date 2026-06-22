"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { http } from "@/shared/api";
import type {
  AllOrdersListResponse,
  AllOrdersSummary,
  OrderListItem,
  OrderListParams,
} from "@/entities/order/model/types";

export const allOrdersQueries = {
  all: () => ["all-orders"] as const,
  list: (params: OrderListParams) =>
    [...allOrdersQueries.all(), "list", params] as const,
};

function buildParams(params: OrderListParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.status && params.status.length > 0)
    out.status = params.status.join(",");
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

const EMPTY_ALL_SUMMARY: AllOrdersSummary = {
  paymentStage: 0,
  newOrderStage: 0,
  dispatchStage: 0,
  shippingStage: 0,
  settledStage: 0,
  claimStage: 0,
};

export function useAllOrders(params: OrderListParams) {
  const query = useQuery({
    queryKey: allOrdersQueries.list(params),
    queryFn: () =>
      http.get<AllOrdersListResponse>("/api/all-orders", {
        params: buildParams(params),
      }),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  return {
    items: (query.data?.items ?? []) as OrderListItem[],
    total: query.data?.total ?? 0,
    counts: query.data?.counts ?? {},
    allSummary: query.data?.allSummary ?? EMPTY_ALL_SUMMARY,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
