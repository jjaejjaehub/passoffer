"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { http } from "@/shared/api";

interface SaveShipDateVariables {
  channelOrderId: string;
  channelType: string;
  shipDate: string | null;
}

interface SaveShipDateResult {
  ok: boolean;
}

interface SaveShipDateError {
  error: string;
  message: string;
}

/**
 * 발송예정일 영구 저장 mutation
 *
 * OMS DB (Fastify 서버)에 발송예정일을 저장한다.
 * 저장 후 해당 주문 쿼리를 무효화하여 UI를 갱신한다.
 *
 * 주의: Fastify 서버에 주문이 없으면 404가 반환된다.
 * 이 경우 사용자에게 "채널 동기화가 필요합니다" 안내를 표시한다.
 */
export function useSaveShipDate(): ReturnType<
  typeof useMutation<SaveShipDateResult, Error, SaveShipDateVariables>
> {
  const queryClient = useQueryClient();

  return useMutation<SaveShipDateResult, Error, SaveShipDateVariables>({
    mutationFn: async (
      variables: SaveShipDateVariables,
    ): Promise<SaveShipDateResult> => {
      return http.post<SaveShipDateResult>("/api/orders/ship-date", variables);
    },
    onSuccess: (_, variables) => {
      // 해당 주문 관련 쿼리 무효화 (Qoo10·Shopify 주문 목록 갱신)
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            (key.includes("qoo10") || key.includes("shopify")) &&
            key.includes("orders")
          );
        },
      });

      void queryClient.invalidateQueries({
        queryKey: ["ship-date", variables.channelOrderId],
      });
    },
    onError: (error: Error) => {
      if (isAxiosError(error)) {
        const data = error.response?.data as SaveShipDateError | undefined;
        if (data?.error === "ORDER_NOT_FOUND") {
          // 주문이 DB에 없는 경우 — 채널 동기화 필요 안내
          // 호출부에서 별도 처리 가능
        }
      }
    },
  });
}
