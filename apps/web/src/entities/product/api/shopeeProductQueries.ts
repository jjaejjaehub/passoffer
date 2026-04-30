'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useChannelApiKey, useChannelUuid } from '@/entities/channel';
import { http } from '@/shared/api';

// ─── 타입 ─────────────────────────────────────────────────────────

export interface ShopeeProductItem {
  itemId: number;
  itemName: string;
  itemSku: string;
  itemStatus: string;
  categoryId: number;
  hasModel: boolean;
  price: number;
  currency: string;
  stock: number;
  imageUrl: string;
  updateTime: number;
}

export interface ShopeeProductsApiResponse {
  totalCount: number;
  hasNextPage: boolean;
  nextOffset: number;
  items: ShopeeProductItem[];
}

export type ShopeeQueryErrorType =
  | 'NO_API_KEY'
  | 'AUTH_ERROR'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface ShopeeQueryError {
  type: ShopeeQueryErrorType;
  message: string;
}

export interface ShopeeProductsQueryParams {
  offset: number;
  pageSize: number;
  itemStatus: string | string[];
  enabled?: boolean;
}

export interface ShopeeProductsQueryResult {
  data: ShopeeProductsApiResponse['items'];
  totalCount: number;
  hasNextPage: boolean;
  nextOffset: number;
  isLoading: boolean;
  error: ShopeeQueryError | null;
  hasApiKey: boolean;
  refetch: () => void;
}

// ─── Query Keys ───────────────────────────────────────────────────

export const shopeeProductsQueryRoot = ['shopee', 'products'] as const;

export const shopeeProductQueries = {
  all: () => shopeeProductsQueryRoot,
  list: (params: Pick<ShopeeProductsQueryParams, 'offset' | 'pageSize' | 'itemStatus'>) =>
    [...shopeeProductsQueryRoot, params] as const,
};

// ─── 에러 파싱 ────────────────────────────────────────────────────

function parseShopeeError(error: unknown): ShopeeQueryError {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;

    const code = data?.error ?? '';
    const message = data?.message ?? '알 수 없는 오류';

    if (code === 'NO_API_KEY') return { type: 'NO_API_KEY', message };
    if (code === 'error_auth' || error.response?.status === 401) {
      return { type: 'AUTH_ERROR', message };
    }
    if (code === 'NETWORK_ERROR') return { type: 'NETWORK_ERROR', message };
    return { type: 'API_ERROR', message };
  }
  return { type: 'UNKNOWN', message: '알 수 없는 오류가 발생했습니다.' };
}

// ─── 훅 ──────────────────────────────────────────────────────────

export function useShopeeProducts(
  params: ShopeeProductsQueryParams,
): ShopeeProductsQueryResult {
  const { hasKey } = useChannelApiKey('shopee');
  const channelUuid = useChannelUuid('shopee');

  const statusList = Array.isArray(params.itemStatus)
    ? params.itemStatus
    : [params.itemStatus];

  const query = useQuery({
    queryKey: shopeeProductQueries.list({
      offset: params.offset,
      pageSize: params.pageSize,
      itemStatus: statusList,
    }),
    queryFn: async (): Promise<ShopeeProductsApiResponse> => {
      if (!channelUuid) throw new Error('Shopee 채널이 연결되지 않았습니다.');

      const searchParams = new URLSearchParams({
        channelId: channelUuid,
        offset: String(params.offset),
        pageSize: String(params.pageSize),
      });
      for (const s of statusList) {
        searchParams.append('itemStatus', s);
      }

      return http.get<ShopeeProductsApiResponse>(
        `/api/products?${searchParams.toString()}`,
      );
    },
    enabled: hasKey && !!channelUuid && (params.enabled !== false),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      const parsed = parseShopeeError(error);
      if (parsed.type === 'NO_API_KEY' || parsed.type === 'AUTH_ERROR') return false;
      return failureCount < 2;
    },
  });

  const parsedError = query.error ? parseShopeeError(query.error) : null;

  return {
    data: query.data?.items ?? [],
    totalCount: query.data?.totalCount ?? 0,
    hasNextPage: query.data?.hasNextPage ?? false,
    nextOffset: query.data?.nextOffset ?? 0,
    isLoading: query.isLoading && hasKey,
    error: parsedError,
    hasApiKey: hasKey,
    refetch: () => { void query.refetch(); },
  };
}
