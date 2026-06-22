/* Qoo10 월 매출 대시보드 전용 훅 */
"use client";

import { format } from "date-fns";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { Order } from "@/entities/order/model/types";
import type {
  Qoo10ClaimItem,
  Qoo10ClaimParams,
  Qoo10ClaimResponse,
  Qoo10ShippingParams,
} from "@/shared/api/qoo10/types";
import { http } from "@/shared/api";
import { useChannelApiKey } from "@/entities/channel";
import type { Qoo10QueryError } from "./qoo10OrderQueries";
import { parseQoo10Error, useQoo10Orders } from "./qoo10OrderQueries";

export interface Qoo10MonthlyDashboardResult {
  orderCount: number;
  totalSalesKrw: number;
  isLoading: boolean;
  error: Qoo10QueryError | null;
  hasApiKey: boolean;
}

function buildMonthlyParams(): Qoo10ShippingParams {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    ShippingStatus: "5",
    SearchStartDate: format(startOfMonth, "yyyyMMdd"),
    SearchEndDate: format(now, "yyyyMMdd"),
    SearchCondition: "2",
  };
}

export function useQoo10MonthlyDashboard(): Qoo10MonthlyDashboardResult {
  const params = buildMonthlyParams();

  const { data, isLoading, error, hasApiKey } = useQoo10Orders(params);

  const validOrders: Order[] = data.filter((order) => !order.claimStatus);

  const orderCount = validOrders.length;

  const totalSalesKrw = validOrders.reduce((sum, order) => {
    return sum + order.krwAmount;
  }, 0);

  return {
    orderCount,
    totalSalesKrw,
    isLoading,
    error,
    hasApiKey,
  };
}

// ─── 클레임 대시보드용 쿼리 ────────────────────────
export const qoo10ClaimQueries = {
  all: () => ["qoo10", "claim"] as const,
  list: (params: Qoo10ClaimParams) =>
    [...qoo10ClaimQueries.all(), params] as const,
};

export interface Qoo10ClaimQueryResult {
  data: Qoo10ClaimItem[];
  isLoading: boolean;
  error: Qoo10QueryError | null;
}

export function useQoo10Claims(
  params: Qoo10ClaimParams,
): Qoo10ClaimQueryResult {
  const { hasKey } = useChannelApiKey("qoo10");

  const query = useQuery({
    queryKey: qoo10ClaimQueries.list(params),
    queryFn: async (): Promise<Qoo10ClaimItem[]> => {
      const res = await http.post<Qoo10ClaimResponse>(
        "/api/qoo10/claim",
        params,
      );
      return res.ResultObject ?? [];
    },
    enabled: hasKey,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      const parsed = parseQoo10Error(error);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR") {
        return false;
      }
      return failureCount < 2;
    },
  });

  const parsedError = query.error ? parseQoo10Error(query.error) : null;

  return {
    data: query.data ?? [],
    isLoading: query.isLoading && hasKey,
    error: parsedError,
  };
}
