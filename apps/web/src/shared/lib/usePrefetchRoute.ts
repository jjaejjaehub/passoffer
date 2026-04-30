'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';

import { useActiveChannel, useChannelUuid } from '@/entities/channel';
import { http } from '@/shared/api';
import { ROUTES } from '@/shared/config';
import { shopifyOrderQueries, qoo10OrderQueries } from '@/entities/order';
import { shopifyProductQueries } from '@/entities/product';
import { credentialQueries } from '@/shared/lib/useChannelApiKey';
import type { ShopifyApiKeys, Qoo10ApiKeys } from '@/shared/config';

const PREFETCH_STALE_TIME = 5 * 60 * 1000;

/**
 * 사이드바 링크에 hover할 때 대상 경로의 주요 쿼리를 미리 fetch한다.
 *
 * P1 적용 후: credential을 TanStack Query 캐시에서 직접 읽어 별도 네트워크 요청 없이
 * 이미 로드된 credential을 활용한다. useChannelApiKey 훅 호출을 제거하고
 * queryClient.getQueryData()로 캐시에서 직접 읽는다.
 */
export function usePrefetchRoute(): {
  prefetch: (route: string) => void;
} {
  const queryClient = useQueryClient();
  const { activeChannel } = useActiveChannel();
  const shopifyChannelUuid = useChannelUuid('shopify');

  const prefetch = useCallback(
    (route: string): void => {
      // TanStack Query 캐시에서 credential을 직접 읽는다 (네트워크 요청 없음)
      const shopifyKeys = queryClient.getQueryData<ShopifyApiKeys | null>(
        credentialQueries.channel('shopify'),
      );
      const qoo10Keys = queryClient.getQueryData<Qoo10ApiKeys | null>(
        credentialQueries.channel('qoo10'),
      );

      const hasShopify = shopifyKeys !== null && shopifyKeys !== undefined
        && shopifyKeys.clientId.length > 0
        && shopifyKeys.accessToken.length > 0;
      const hasQoo10 = qoo10Keys !== null && qoo10Keys !== undefined
        && qoo10Keys.certificationKey.length > 0;

      const dateFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');

      // /orders 또는 /claims → 주문/클레임 목록 prefetch
      if (route.startsWith(ROUTES.orders)) {
        if (activeChannel === 'shopify' && hasShopify && shopifyChannelUuid) {
          const listParams = {
            pageSize: 50,
            after: undefined,
            financialStatus: undefined,
            fulfillmentStatus: undefined,
            keyword: undefined,
            dateFrom,
            dateTo: undefined,
          };
          const startDate = dateFrom.replace(/-/g, '');
          void queryClient.prefetchQuery({
            queryKey: shopifyOrderQueries.list(listParams),
            queryFn: () =>
              http.get(
                `/api/orders?channelId=${shopifyChannelUuid}&startDate=${startDate}&endDate=${format(new Date(), 'yyyyMMdd')}`,
              ),
            staleTime: PREFETCH_STALE_TIME,
          });
        }

        if ((activeChannel === 'qoo10' || !activeChannel) && hasQoo10) {
          const today = new Date();
          const defaultParams = {
            ShippingStatus: '' as const,
            SearchStartDate: format(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), 'yyyyMMdd'),
            SearchEndDate: format(today, 'yyyyMMdd'),
            SearchCondition: '1' as const,
          };
          void queryClient.prefetchQuery({
            queryKey: qoo10OrderQueries.list(defaultParams),
            queryFn: () => http.post('/api/qoo10/shipping', defaultParams),
            staleTime: PREFETCH_STALE_TIME,
          });
        }
        return;
      }

      // /products → 상품 목록 prefetch
      if (route === ROUTES.products) {
        if (activeChannel === 'shopify' && hasShopify && shopifyChannelUuid) {
          const listParams = {
            pageSize: 50,
            after: undefined,
            status: undefined,
            keyword: undefined,
          };
          void queryClient.prefetchQuery({
            queryKey: shopifyProductQueries.list(listParams),
            queryFn: () =>
              http.get(`/api/products?channelId=${shopifyChannelUuid}&pageSize=50`),
            staleTime: PREFETCH_STALE_TIME,
          });
        }
        return;
      }

      // /dashboard → 주문 통계 prefetch
      if (route === ROUTES.dashboard) {
        if (hasShopify && shopifyChannelUuid) {
          const startDate = dateFrom.replace(/-/g, '');
          void queryClient.prefetchQuery({
            queryKey: shopifyOrderQueries.stats({ dateFrom }),
            queryFn: () =>
              http.get(
                `/api/orders?channelId=${shopifyChannelUuid}&startDate=${startDate}&endDate=${format(new Date(), 'yyyyMMdd')}`,
              ),
            staleTime: PREFETCH_STALE_TIME,
          });
        }
        return;
      }
    },
    [queryClient, activeChannel, shopifyChannelUuid],
  );

  return { prefetch };
}
