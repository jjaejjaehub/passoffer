"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { http } from "@/shared/api";

import { goodsInventoryQueries } from "./goodsInventoryQueries";
import { productQueries } from "./productQueries";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUpdateQtyError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (isRecord(data) && typeof data.message === "string") {
      return data.message;
    }
    return "재고 수량 수정에 실패했습니다.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "재고 수량 수정에 실패했습니다.";
}

export interface UpdateSimpleQtyInput {
  itemCode: string;
  sellerCode: string;
  newQty: number;
}

export function useUpdateSimpleQty(): {
  mutateAsync: (input: UpdateSimpleQtyInput) => Promise<void>;
  isPending: boolean;
  error: string | null;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, unknown, UpdateSimpleQtyInput>({
    mutationFn: async ({ itemCode, sellerCode, newQty }) => {
      const res = await http.post<{ ok: boolean }>(
        "/api/qoo10/items/price-qty",
        {
          itemCode,
          sellerCode: sellerCode.trim() || undefined,
          itemQty: newQty,
        },
      );

      if (isRecord(res) && "error" in res) {
        throw new Error(
          typeof (res as Record<string, unknown>).message === "string"
            ? String((res as Record<string, unknown>).message)
            : "재고 수량 수정에 실패했습니다.",
        );
      }
    },
    onSuccess: (_data, { itemCode, sellerCode }) => {
      void queryClient.invalidateQueries({
        queryKey: productQueries.detail(itemCode, sellerCode),
      });
      void queryClient.invalidateQueries({
        queryKey: goodsInventoryQueries.byItem(itemCode, sellerCode),
      });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? parseUpdateQtyError(mutation.error) : null,
  };
}
