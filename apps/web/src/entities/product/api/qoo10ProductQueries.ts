"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import type { Product } from "@oms/types";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import { QOO10_GET_ALL_GOODS_ITEM_STATUSES } from "@/shared/api/qoo10/types";
import { qoo10ProductsQueryRoot } from "@/shared/config";
import type {
  Qoo10ProductsQueryParams,
  Qoo10ProductsQueryResult,
  Qoo10QueryError,
} from "../model/types";

export const QOO10_PRODUCT_LIST_STATUSES = QOO10_GET_ALL_GOODS_ITEM_STATUSES;

export const qoo10ProductQueries = {
  all: () => qoo10ProductsQueryRoot,
  list: (channelId: string, itemStatus: string, page: string) =>
    [...qoo10ProductsQueryRoot, channelId, itemStatus, page] as const,
  listMerged: (channelId: string, page: string) =>
    [...qoo10ProductsQueryRoot, channelId, "merged", page] as const,
};

function parseQoo10Error(error: unknown): Qoo10QueryError {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    const errorCode = data?.error;
    const message = data?.message ?? "알 수 없는 오류";

    if (errorCode === "NO_API_KEY") return { type: "NO_API_KEY", message };
    if (errorCode === "AUTH_ERROR") return { type: "AUTH_ERROR", message };
    if (errorCode === "NETWORK_ERROR")
      return { type: "NETWORK_ERROR", message };
    return { type: "API_ERROR", message };
  }
  return { type: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
}

const retryPredicate = (failureCount: number, error: unknown): boolean => {
  const parsed = parseQoo10Error(error);
  if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR")
    return false;
  return failureCount < 2;
};

interface Qoo10ProductsApiResponse {
  items: Product[];
  totalItems: number;
  totalPages: number;
  statusTotals?: Record<string, number>;
}

async function fetchQoo10Products(
  channelId: string,
  itemStatus: string,
  page: string,
  mergeAll: boolean,
): Promise<Qoo10ProductsApiResponse> {
  const params = new URLSearchParams({ channelId, page });
  if (mergeAll) {
    params.set("mergeAll", "true");
  } else {
    params.set("itemStatus", itemStatus);
  }
  const raw = await http.get<{
    items: Product[];
    totalItems: number;
    totalPages: number;
    statusTotals?: Record<string, number>;
  }>(`/api/products?${params.toString()}`);
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    items,
    totalItems: raw.totalItems ?? items.length,
    totalPages: raw.totalPages ?? 1,
    statusTotals: raw.statusTotals,
  };
}

export function useQoo10Products(
  params: Qoo10ProductsQueryParams,
): Qoo10ProductsQueryResult {
  const { hasKey } = useChannelApiKey("qoo10");
  const channelUuid = useChannelUuid("qoo10");
  const mergeAll = params.mergeAllStatuses === true;
  const page = params.Page;
  const externalEnabled = params.enabled !== false;
  const enabled = hasKey && !!channelUuid && externalEnabled;

  const mergedQuery = useQuery({
    queryKey: channelUuid
      ? qoo10ProductQueries.listMerged(channelUuid, page)
      : ["qoo10", "products", "merged-disabled"],
    queryFn: async (): Promise<Qoo10ProductsApiResponse> => {
      return fetchQoo10Products(channelUuid!, "S2", page, true);
    },
    enabled: enabled && mergeAll,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: retryPredicate,
  });

  const singleQuery = useQuery({
    queryKey: channelUuid
      ? qoo10ProductQueries.list(channelUuid, params.ItemStatus, page)
      : ["qoo10", "products", "single-disabled"],
    queryFn: async (): Promise<Qoo10ProductsApiResponse> => {
      return fetchQoo10Products(channelUuid!, params.ItemStatus, page, false);
    },
    enabled: enabled && !mergeAll,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: retryPredicate,
  });

  const activeQuery = mergeAll ? mergedQuery : singleQuery;
  const result = activeQuery.data;
  const isLoading =
    hasKey &&
    (activeQuery.isLoading ||
      (activeQuery.fetchStatus === "fetching" && activeQuery.isPending));

  return {
    data: result?.items ?? [],
    totalItems: result?.totalItems ?? 0,
    totalPages: result?.totalPages ?? 1,
    isLoading,
    error: activeQuery.error ? parseQoo10Error(activeQuery.error) : null,
    hasApiKey: hasKey,
    statusTotals: result?.statusTotals,
    refetch: () => {
      void activeQuery.refetch();
    },
  };
}
