"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { http } from "@/shared/api";
import type {
  NewOrderListItem,
  NewOrderListResponse,
  OrderListParams,
  SlaSummary,
} from "@/entities/order/model/types";

export const newOrdersQueries = {
  all: () => ["new-orders"] as const,
  list: (params: OrderListParams) =>
    [...newOrdersQueries.all(), "list", params] as const,
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
  if (params.duplicateOnly) out.duplicateOnly = "true";
  return out;
}

const EMPTY_SLA_SUMMARY: SlaSummary = {
  slaHours: 24,
  warnHours: 18,
  overdueCount: 0,
  dueSoonCount: 0,
  now: new Date(0).toISOString(),
};

export function useNewOrders(params: OrderListParams) {
  const query = useQuery({
    queryKey: newOrdersQueries.list(params),
    queryFn: () =>
      http.get<NewOrderListResponse>("/api/new-orders", {
        params: buildParams(params),
      }),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  return {
    items: (query.data?.items ?? []) as NewOrderListItem[],
    total: query.data?.total ?? 0,
    counts: query.data?.counts ?? {},
    slaSummary: query.data?.slaSummary ?? EMPTY_SLA_SUMMARY,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
