"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey } from "@/entities/channel";
import { http } from "@/shared/api";
import type { Qoo10ItemDetailResponse } from "@/shared/api/qoo10/itemTypes";
import { QOO10_ERROR_CODES } from "@/shared/api/qoo10/types";

import { adaptQoo10ItemDetail } from "../model/adapter";
import type { Product, Qoo10QueryError } from "../model/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProductDetailError(error: unknown): Qoo10QueryError {
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
            code === QOO10_ERROR_CODES.KEY_EXPIRED ||
            code === QOO10_ERROR_CODES.KEY_EXPIRED_2 ||
            code === QOO10_ERROR_CODES.NOT_AUTHORIZED ||
            code === QOO10_ERROR_CODES.NOT_AUTHORIZED_2);

        if (isAuthCode) {
          return { type: "AUTH_ERROR", message };
        }

        if (code === QOO10_ERROR_CODES.TRADE_STATUS_RESTRICTED) {
          return {
            type: "STATUS_RESTRICTED",
            message:
              "거래대기(S1) 또는 거래가능(S2) 상태의 상품만 상세 조회할 수 있습니다.",
          };
        }

        return { type: "API_ERROR", message };
      }
    }

    return { type: "API_ERROR", message: "상품 상세를 불러오지 못했습니다." };
  }

  if (error instanceof Error && error.message === "EMPTY_RESULT") {
    return {
      type: "API_ERROR",
      message: "상품 상세 데이터가 비어 있습니다.",
    };
  }

  return { type: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
}

export const productQueries = {
  all: () => ["products"] as const,
  detail: (itemCode: string, sellerCode: string) =>
    [...productQueries.all(), "detail", itemCode, sellerCode] as const,
};

export interface ProductDetailQueryInput {
  itemCode: string;
  sellerCode: string;
  hasKey: boolean;
}

export function productDetailQueryOptions(input: ProductDetailQueryInput) {
  const { itemCode, sellerCode, hasKey } = input;

  const enabled = Boolean(itemCode) && hasKey;

  return queryOptions({
    queryKey: productQueries.detail(itemCode, sellerCode),
    queryFn: async (): Promise<Product> => {
      const sellerTrimmed = sellerCode.trim();
      const response = await http.get<Qoo10ItemDetailResponse>(
        `/api/qoo10/items/${encodeURIComponent(itemCode)}`,
        {
          ...(sellerTrimmed.length > 0
            ? { params: { SellerCode: sellerTrimmed } }
            : {}),
        },
      );

      const first = response.ResultObject?.[0];
      if (first === undefined) {
        throw new Error("EMPTY_RESULT");
      }

      return adaptQoo10ItemDetail(first);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, err) => {
      const parsed = parseProductDetailError(err);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR") {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useProductDetail(
  itemCode: string | null,
  sellerCode: string | null,
): {
  product: Product | undefined;
  isLoading: boolean;
  error: Qoo10QueryError | null;
  refetch: () => void;
  hasApiKey: boolean;
} {
  const { hasKey } = useChannelApiKey("qoo10");
  const code = itemCode ?? "";
  const seller = sellerCode ?? "";

  const query = useQuery({
    ...productDetailQueryOptions({
      itemCode: code,
      sellerCode: seller,
      hasKey,
    }),
  });

  const parsedError = query.error ? parseProductDetailError(query.error) : null;

  return {
    product: query.data,
    isLoading: query.isLoading && hasKey && Boolean(code),
    error: parsedError,
    refetch: () => {
      void query.refetch();
    },
    hasApiKey: hasKey,
  };
}
