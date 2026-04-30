"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { format, subDays } from "date-fns";

import { adaptQoo10Orders, useChannelApiKey } from "@/entities/channel";
import type { Order } from "@/entities/order/model/types";
import { http } from "@/shared/api";
import type {
  Qoo10ShippingParams,
  Qoo10ShippingResponse,
} from "@/shared/api/qoo10/types";

// ─── 에러 유형 ───────────────────────────────────
export type Qoo10QueryErrorType =
  | "NO_API_KEY" // 키 미설정
  | "AUTH_ERROR" // 키 인증 실패 / 만료
  | "NETWORK_ERROR" // 네트워크 오류
  | "API_ERROR" // Qoo10 비즈니스 에러
  | "UNKNOWN";

export interface Qoo10QueryError {
  type: Qoo10QueryErrorType;
  message: string;
}

// ─── query factory ───────────────────────────────
export const qoo10OrderQueries = {
  all: () => ["qoo10", "orders"] as const,
  list: (params: Qoo10ShippingParams) =>
    [...qoo10OrderQueries.all(), params] as const,
};

// ─── 날짜 유틸 ───────────────────────────────────
function toQoo10Date(date: Date): string {
  return format(date, "yyyyMMdd");
}

function getDefaultParams(): Qoo10ShippingParams {
  const today = new Date();
  return {
    ShippingStatus: "",
    SearchStartDate: toQoo10Date(subDays(today, 30)),
    SearchEndDate: toQoo10Date(today),
    SearchCondition: "1", // 1: 주문일 기준
  };
}

// ─── API 응답 에러 → Qoo10QueryError 변환 ─────────
export function parseQoo10Error(error: unknown): Qoo10QueryError {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    const errorCode = data?.error;
    const message = data?.message ?? "알 수 없는 오류";

    if (errorCode === "NO_API_KEY") {
      return { type: "NO_API_KEY", message };
    }
    if (errorCode === "AUTH_ERROR") {
      return { type: "AUTH_ERROR", message };
    }
    if (errorCode === "NETWORK_ERROR") {
      return { type: "NETWORK_ERROR", message };
    }
    if (errorCode === "PERIOD_EXCEEDED") {
      // Qoo10 90일 초과 에러 → 사용자 친화적인 메시지로 변환
      return {
        type: "API_ERROR",
        message: "조회 기간을 90일 이내로 조정해 주세요.",
      };
    }
    return { type: "API_ERROR", message };
  }
  return { type: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
}

// ─── 메인 훅 ─────────────────────────────────────
export function useQoo10Orders(
  params?: Partial<Qoo10ShippingParams> & { enabled?: boolean },
): {
  data: Order[];
  isLoading: boolean;
  error: Qoo10QueryError | null;
  hasApiKey: boolean;
  refetch: () => void;
} {
  const { hasKey } = useChannelApiKey("qoo10");
  const externalEnabled = params?.enabled !== false;

  const fullParams: Qoo10ShippingParams = {
    ...getDefaultParams(),
    ...params,
  };

  const query = useQuery({
    queryKey: qoo10OrderQueries.list(fullParams),
    queryFn: async (): Promise<Order[]> => {
      const res = await http.post<Qoo10ShippingResponse>(
        "/api/qoo10/shipping",
        fullParams,
      );

      return adaptQoo10Orders(res.ResultObject);
    },
    enabled: hasKey && externalEnabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      const parsed = parseQoo10Error(error);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR")
        return false;
      return failureCount < 2;
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading && hasKey && externalEnabled,
    error: query.error ? parseQoo10Error(query.error) : null,
    hasApiKey: hasKey,
    refetch: query.refetch,
  };
}
