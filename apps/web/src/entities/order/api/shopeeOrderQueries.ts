"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { format, subDays } from "date-fns";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import type { Order } from "../model/types";

// ─── 에러 타입 ─────────────────────────────────────────────────

export type ShopeeOrderQueryErrorType =
  | "NO_API_KEY"
  | "AUTH_ERROR"
  | "NETWORK_ERROR"
  | "API_ERROR"
  | "UNKNOWN";

export interface ShopeeOrderQueryError {
  type: ShopeeOrderQueryErrorType;
  message: string;
}

// ─── 파라미터/결과 타입 ────────────────────────────────────────

export interface ShopeeOrdersQueryParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  searchCondition?: string;
  enabled?: boolean;
}

export interface ShopeeOrdersQueryResult {
  data: Order[];
  isLoading: boolean;
  error: ShopeeOrderQueryError | null;
  hasApiKey: boolean;
  refetch: () => void;
}

// ─── Query Keys ────────────────────────────────────────────────

export const shopeeOrderQueries = {
  all: () => ["shopee", "orders"] as const,
  list: (params: Omit<ShopeeOrdersQueryParams, "enabled">) =>
    [...shopeeOrderQueries.all(), params] as const,
};

// ─── 날짜 유틸 ───────────────────────────────────────────────

function toShopeeDate(date: Date): string {
  return format(date, "yyyyMMdd");
}

function getDefaultDates(): { startDate: string; endDate: string } {
  const today = new Date();
  return {
    startDate: toShopeeDate(subDays(today, 30)),
    endDate: toShopeeDate(today),
  };
}

// ─── 에러 파싱 ─────────────────────────────────────────────────

export function parseShopeeOrderError(error: unknown): ShopeeOrderQueryError {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    const code = data?.error ?? "";
    const message = data?.message ?? "알 수 없는 오류";

    if (code === "NO_API_KEY") return { type: "NO_API_KEY", message };
    if (code === "AUTH_ERROR" || error.response?.status === 401)
      return { type: "AUTH_ERROR", message };
    if (code === "NETWORK_ERROR") return { type: "NETWORK_ERROR", message };
    return { type: "API_ERROR", message };
  }
  return { type: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
}

// ─── 주문 목록 훅 ──────────────────────────────────────────────

export function useShopeeOrders(
  params: ShopeeOrdersQueryParams = {},
): ShopeeOrdersQueryResult {
  const { hasKey } = useChannelApiKey("shopee");
  const channelUuid = useChannelUuid("shopee");

  const defaults = getDefaultDates();
  const {
    startDate = defaults.startDate,
    endDate = defaults.endDate,
    status,
    searchCondition,
    enabled = true,
  } = params;

  const query = useQuery({
    queryKey: shopeeOrderQueries.list({
      startDate,
      endDate,
      status,
      searchCondition,
    }),
    queryFn: async (): Promise<Order[]> => {
      if (!channelUuid) {
        throw Object.assign(new Error("NO_API_KEY"), {
          response: {
            data: {
              error: "NO_API_KEY",
              message:
                "Shopee 채널이 연결되지 않았습니다. 채널 설정에서 등록해 주세요.",
            },
          },
        });
      }

      const searchParams = new URLSearchParams({
        channelId: channelUuid,
        startDate,
        endDate,
      });
      if (status) searchParams.set("status", status);
      if (searchCondition) searchParams.set("searchCondition", searchCondition);

      return http.get<Order[]>(`/api/orders?${searchParams.toString()}`);
    },
    enabled: hasKey && !!channelUuid && enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      const parsed = parseShopeeOrderError(error);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR")
        return false;
      return failureCount < 2;
    },
  });

  return {
    data: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading && hasKey && enabled,
    error: query.error ? parseShopeeOrderError(query.error) : null,
    hasApiKey: hasKey,
    refetch: () => {
      void query.refetch();
    },
  };
}
