import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/shared/mocks/test-utils';
import { TEST_CHANNEL_UUID } from '@/shared/mocks/handlers';
import {
  useShopifyOrders,
  useShopifyOrderStats,
} from './shopifyOrderQueries';

// ─── useChannelApiKey / useChannelUuid 모킹 ────────────────────
vi.mock('@/entities/channel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/channel')>();
  return {
    ...actual,
    useChannelApiKey: (channelId: string) => {
      if (channelId === 'shopify') {
        return { keys: {}, hasKey: true, isLoading: false, saveKeys: vi.fn(), removeKeys: vi.fn() };
      }
      return { keys: null, hasKey: false, isLoading: false, saveKeys: vi.fn(), removeKeys: vi.fn() };
    },
    useChannelUuid: (channelId: string) => {
      if (channelId === 'shopify') return TEST_CHANNEL_UUID;
      return null;
    },
  };
});

describe('useShopifyOrders', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('API 키가 있을 때 주문 목록을 가져온다', async () => {
    const { result } = renderHook(() => useShopifyOrders(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasApiKey).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].channelOrderId).toBe('#1001');
    expect(result.current.data[0].status).toBe('PAID');
    expect(result.current.error).toBeNull();
  });

  it('주문 목록에 pageInfo가 포함된다', async () => {
    const { result } = renderHook(() => useShopifyOrders({ pageSize: 50 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pageInfo.hasNextPage).toBe(false);
    expect(result.current.pageInfo.hasPreviousPage).toBe(false);
  });

  it('API 오류 시 에러 상태를 반환한다', async () => {
    server.use(
      http.get('/api/orders', () => {
        return HttpResponse.json(
          { error: 'AUTH_ERROR', message: 'Shopify 인증 오류' },
          { status: 401 },
        );
      }),
    );

    const { result } = renderHook(() => useShopifyOrders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    }, { timeout: 5000 });

    expect(result.current.error?.type).toBe('AUTH_ERROR');
    expect(result.current.data).toHaveLength(0);
  });

  it('enabled: false 시 쿼리를 실행하지 않는다', () => {
    const { result } = renderHook(() => useShopifyOrders({ enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toHaveLength(0);
  });
});

describe('useShopifyOrderStats', () => {
  it('API 키가 있을 때 통계를 가져온다', async () => {
    const { result } = renderHook(
      () => useShopifyOrderStats({ dateFrom: '2024-01-01' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.orderCount).toBe(1);
    expect(result.current.totalRevenue).toBe(50000);
    expect(result.current.currencyCode).toBe('KRW');
    expect(result.current.error).toBeNull();
    expect(result.current.hasApiKey).toBe(true);
  });

  it('fulfillmentBreakdown이 주문 상태를 집계한다', async () => {
    const { result } = renderHook(
      () => useShopifyOrderStats({}),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.fulfillmentBreakdown).toEqual({ PAID: 1 });
  });

  it('enabled: false 시 로딩 없이 기본값을 반환한다', () => {
    const { result } = renderHook(
      () => useShopifyOrderStats({ enabled: false }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.orderCount).toBe(0);
    expect(result.current.totalRevenue).toBe(0);
  });
});
