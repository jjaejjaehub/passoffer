"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey } from "@/entities/channel";
import { http } from "@/shared/api";
import type { Qoo10GoodsInventoryRow } from "@/shared/api/qoo10/goodsInventoryTypes";
import { QOO10_ERROR_CODES } from "@/shared/api/qoo10/types";

import type { Qoo10QueryError } from "../model/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGoodsInventoryError(error: unknown): Qoo10QueryError {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (isRecord(data)) {
      const errorCode = data.error;
      const message =
        typeof data.message === "string" ? data.message : "알 수 없는 오류";

      if (errorCode === "NO_API_KEY" || status === 401) {
        return { type: "NO_API_KEY", message };
      }

      if (errorCode === "NETWORK_ERROR") {
        return { type: "NETWORK_ERROR", message };
      }

      if (errorCode === "API_ERROR") {
        const code = data.code;
        const isAuthCode =
          typeof code === "number" &&
          (code === QOO10_ERROR_CODES.INVALID_AUTH_KEY ||
            code === QOO10_ERROR_CODES.API_NOT_EXIST ||
            code === QOO10_ERROR_CODES.KEY_EXPIRED ||
            code === QOO10_ERROR_CODES.KEY_EXPIRED_2 ||
            code === QOO10_ERROR_CODES.NOT_AUTHORIZED ||
            code === QOO10_ERROR_CODES.NOT_AUTHORIZED_2);

        if (isAuthCode) {
          return { type: "AUTH_ERROR", message };
        }

        return { type: "API_ERROR", message };
      }
    }

    return {
      type: "API_ERROR",
      message: "옵션 정보를 불러오지 못했습니다.",
    };
  }

  return { type: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
}

export const goodsInventoryQueries = {
  all: () => ["products", "goodsInventory"] as const,
  byItem: (itemCode: string, sellerCode: string) =>
    [...goodsInventoryQueries.all(), itemCode, sellerCode] as const,
};

export interface GoodsInventoryQueryInput {
  itemCode: string;
  sellerCode: string;
  hasKey: boolean;
}

export function goodsInventoryQueryOptions(
  input: GoodsInventoryQueryInput,
) {
  const { itemCode, sellerCode, hasKey } = input;
  const code = itemCode.trim();
  const sellerTrimmed = sellerCode.trim();

  const enabled = code.length > 0 && hasKey;

  return queryOptions({
    queryKey: goodsInventoryQueries.byItem(code, sellerTrimmed),
    queryFn: async (): Promise<Qoo10GoodsInventoryRow[]> => {
      const response = await http.get<
        { type: "none" } | { type: "inventory"; items: Qoo10GoodsInventoryRow[] }
      >(
        `/api/qoo10/items/${encodeURIComponent(code)}/inventory`,
        {
          ...(sellerTrimmed.length > 0
            ? { params: { SellerCode: sellerTrimmed } }
            : {}),
        },
      );

      if (response.type === "none") {
        return [];
      }
      return response.items;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, err) => {
      const parsed = parseGoodsInventoryError(err);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR") {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useGoodsInventory(
  itemCode: string,
  sellerCode: string,
): {
  rows: Qoo10GoodsInventoryRow[];
  isLoading: boolean;
  error: Qoo10QueryError | null;
  refetch: () => void;
  hasApiKey: boolean;
} {
  const { hasKey } = useChannelApiKey("qoo10");

  const query = useQuery({
    ...goodsInventoryQueryOptions({
      itemCode,
      sellerCode,
      hasKey,
    }),
  });

  const parsedError = query.error
    ? parseGoodsInventoryError(query.error)
    : null;

  return {
    rows: query.data ?? [],
    isLoading:
      query.isLoading &&
      hasKey &&
      Boolean(itemCode.trim()),
    error: parsedError,
    refetch: () => {
      void query.refetch();
    },
    hasApiKey: hasKey,
  };
}
