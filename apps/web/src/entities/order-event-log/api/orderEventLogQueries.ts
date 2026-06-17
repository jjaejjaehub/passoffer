"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type {
  OrderEventLogListFilters,
  OrderEventLogsResponse,
} from "../model/types";

export const orderEventLogsQueryRoot = ["order-event-logs"] as const;

export const orderEventLogQueries = {
  all: () => orderEventLogsQueryRoot,
  infinite: (filters: Omit<OrderEventLogListFilters, "cursor">) =>
    [...orderEventLogsQueryRoot, "infinite", filters] as const,
};

function buildParams(filters: OrderEventLogListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.eventType && filters.eventType.length > 0) {
    params.set("eventType", filters.eventType.join(","));
  }
  if (filters.result && filters.result.length > 0) {
    params.set("result", filters.result.join(","));
  }
  if (filters.channelId) params.set("channelId", filters.channelId);
  if (filters.orderId) params.set("orderId", filters.orderId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  return params;
}

export function useOrderEventLogs(
  filters: Omit<OrderEventLogListFilters, "cursor"> = {},
) {
  return useInfiniteQuery({
    queryKey: orderEventLogQueries.infinite(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<OrderEventLogsResponse> => {
      const params = buildParams({ ...filters, cursor: pageParam });
      const qs = params.toString();
      return http.get<OrderEventLogsResponse>(
        `/api/order-event-logs${qs ? `?${qs}` : ""}`,
      );
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function buildOrderEventLogCsvUrl(
  filters: Omit<OrderEventLogListFilters, "cursor" | "pageSize"> & {
    limit?: number;
  } = {},
): string {
  const params = new URLSearchParams();
  if (filters.eventType && filters.eventType.length > 0) {
    params.set("eventType", filters.eventType.join(","));
  }
  if (filters.result && filters.result.length > 0) {
    params.set("result", filters.result.join(","));
  }
  if (filters.channelId) params.set("channelId", filters.channelId);
  if (filters.orderId) params.set("orderId", filters.orderId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return `/api/order-event-logs.csv${qs ? `?${qs}` : ""}`;
}
