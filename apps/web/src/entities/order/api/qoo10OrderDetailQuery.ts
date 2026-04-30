"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey } from "@/entities/channel";
import { http } from "@/shared/api";
import type {
  Qoo10OrderDetailItem,
  Qoo10OrderDetailResponse,
} from "@/shared/api/qoo10/types";

import { parseQoo10Error, type Qoo10QueryError } from "./qoo10OrderQueries";

// ─── query factory ───────────────────────────────
export const qoo10OrderDetailQueries = {
  all: () => ["qoo10", "orderDetail"] as const,
  detail: (orderNo: string) =>
    [...qoo10OrderDetailQueries.all(), orderNo] as const,
};

// ─── 메인 훅 ─────────────────────────────────────
export function useQoo10OrderDetail(orderNo: string | null): {
  data: Qoo10OrderDetailItem | null;
  isLoading: boolean;
  error: Qoo10QueryError | null;
} {
  const { hasKey } = useChannelApiKey("qoo10");

  const query = useQuery({
    queryKey: orderNo
      ? qoo10OrderDetailQueries.detail(orderNo)
      : ["qoo10", "orderDetail", "__disabled__"],
    queryFn: async (): Promise<Qoo10OrderDetailItem> => {
      const res = await http.get<Qoo10OrderDetailResponse>(
        `/api/qoo10/shipping/${orderNo}`,
      );

      // ResultObject는 배열로 내려오므로 첫 번째 항목을 사용
      const item = Array.isArray(res.ResultObject) ? res.ResultObject[0] : null;
      if (!item) throw new Error("주문 상세 데이터가 없습니다.");
      return item;
    },
    enabled: hasKey && orderNo !== null,
    staleTime: 2 * 60 * 1000, // 2분
    retry: (failureCount, error) => {
      if (!isAxiosError(error)) return false;
      const parsed = parseQoo10Error(error);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR")
        return false;
      return failureCount < 1;
    },
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading && hasKey && orderNo !== null,
    error: query.error ? parseQoo10Error(query.error) : null,
  };
}
