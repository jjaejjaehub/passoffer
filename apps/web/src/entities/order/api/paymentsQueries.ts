"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { http } from "@/shared/api";
import type {
  OrderListParams,
  PaymentListResponse,
  PaymentOrderListItem,
  PaymentSummary,
} from "@/entities/order/model/types";

export const paymentsQueries = {
  all: () => ["payments"] as const,
  list: (params: OrderListParams) =>
    [...paymentsQueries.all(), "list", params] as const,
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

const EMPTY_SUMMARY: PaymentSummary = {
  sumTotal: "0",
  byPaymentMethod: {},
  byCurrency: [],
};

export function usePayments(params: OrderListParams) {
  const query = useQuery({
    queryKey: paymentsQueries.list(params),
    queryFn: () =>
      http.get<PaymentListResponse>("/api/payments", {
        params: buildParams(params),
      }),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  return {
    items: (query.data?.items ?? []) as PaymentOrderListItem[],
    total: query.data?.total ?? 0,
    counts: query.data?.counts ?? {},
    paymentSummary: query.data?.paymentSummary ?? EMPTY_SUMMARY,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
