'use client';

import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useChannelApiKey, useChannelUuid } from '@/entities/channel';
import { http } from '@/shared/api';

// ─── 타입 ────────────────────────────────────────────────────────

export interface ShopeeProductDetailItem {
  itemId: number;
  itemName: string;
  description: string;
  itemSku: string;
  itemStatus: string;
  categoryId: number;
  hasModel: boolean;
  createTime: number;
  updateTime: number;
  condition: string;
  weight: string;
  dimension: { length: number; width: number; height: number } | null;
  preOrder: { isPreOrder: boolean; daysToShip: number } | null;
  brand: { brandId: number; brandName: string } | null;
  price: number;
  currency: string;
  stock: number;
  images: string[];
  logistics: Array<{
    logisticId: number;
    logisticName: string;
    enabled: boolean;
    isFree: boolean;
    estimatedShippingFee: number;
  }>;
  attributes: Array<{
    attributeId: number;
    attributeName: string;
    isMandatory: boolean;
    values: Array<{ valueId: number; valueName: string; valueUnit: string }>;
  }>;
  wholesales: Array<{ minCount: number; maxCount: number; unitPrice: number }>;
  videos: Array<{ videoUrl: string; thumbnailUrl: string; duration: number }>;
  tierVariations: Array<{
    name: string;
    options: Array<{ option: string; imageUrl: string }>;
  }>;
  models: Array<{
    modelId: number;
    modelSku: string;
    modelStatus: string;
    tierIndex: number[];
    price: number;
    currency: string;
    stock: number;
  }>;
}

export interface ShopeeProductDetailApiResponse {
  item: ShopeeProductDetailItem;
}

// ─── 에러 타입 ───────────────────────────────────────────────────

export type ShopeeDetailQueryErrorType =
  | 'NO_API_KEY'
  | 'NOT_FOUND'
  | 'AUTH_ERROR'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface ShopeeDetailQueryError {
  type: ShopeeDetailQueryErrorType;
  message: string;
}

export interface ShopeeProductDetailQueryResult {
  item: ShopeeProductDetailItem | null;
  isLoading: boolean;
  error: ShopeeDetailQueryError | null;
  hasApiKey: boolean;
}

// ─── 에러 파싱 ───────────────────────────────────────────────────

function parseShopeeDetailError(error: unknown): ShopeeDetailQueryError {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    const code = data?.error ?? '';
    const message = data?.message ?? '알 수 없는 오류';

    if (code === 'NO_API_KEY') return { type: 'NO_API_KEY', message };
    if (code === 'error_item_not_found') return { type: 'NOT_FOUND', message };
    if (code === 'error_auth' || error.response?.status === 401)
      return { type: 'AUTH_ERROR', message };
    if (code === 'NETWORK_ERROR') return { type: 'NETWORK_ERROR', message };
    return { type: 'API_ERROR', message };
  }
  return { type: 'UNKNOWN', message: '알 수 없는 오류가 발생했습니다.' };
}

// ─── 훅 ─────────────────────────────────────────────────────────

export function useShopeeProductDetail(
  itemId: number | null,
): ShopeeProductDetailQueryResult {
  const { hasKey } = useChannelApiKey('shopee');
  const channelUuid = useChannelUuid('shopee');

  const query = useQuery({
    queryKey: ['shopee', 'products', 'detail', itemId] as const,
    queryFn: async (): Promise<ShopeeProductDetailApiResponse> => {
      if (!channelUuid) throw new Error('Shopee 채널이 연결되지 않았습니다.');

      return http.get<ShopeeProductDetailApiResponse>(
        `/api/products/${channelUuid}/${encodeURIComponent(String(itemId))}`,
      );
    },
    enabled: hasKey && !!channelUuid && itemId !== null,
    staleTime: 3 * 60 * 1000,
    retry: (failureCount, error) => {
      const parsed = parseShopeeDetailError(error);
      if (
        parsed.type === 'NO_API_KEY' ||
        parsed.type === 'AUTH_ERROR' ||
        parsed.type === 'NOT_FOUND'
      )
        return false;
      return failureCount < 2;
    },
  });

  return {
    item: query.data?.item ?? null,
    isLoading: query.isLoading && hasKey && itemId !== null,
    error: query.error ? parseShopeeDetailError(query.error) : null,
    hasApiKey: hasKey,
  };
}
