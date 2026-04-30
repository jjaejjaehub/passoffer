import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/shared/mocks/test-utils';
import { TEST_CHANNEL_UUID } from '@/shared/mocks/handlers';
import { useShopifyReturns, useShopifyReturnStats } from './shopifyReturnQueries';

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

const returnsUrl = `/api/orders/${TEST_CHANNEL_UUID}/returns`;

const mockReturnItem = {
  returnId: 'ret_001',
  returnName: '#R001',
  status: 'OPEN',
  createdAt: '2024-01-15T00:00:00Z',
  closedAt: null,
  requestApprovedAt: null,
  orderId: 'order-1',
  orderName: '#1001',
  orderCreatedAt: '2024-01-10T00:00:00Z',
  customerName: '홍길동',
  customerEmail: 'test@example.com',
  shippingCity: '서울',
  shippingCountry: 'KR',
  lineItems: [],
  totalRefunded: '0',
  currencyCode: 'KRW',
};

// ─── useShopifyReturns 테스트 ─────────────────────────────────

describe('useShopifyReturns', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('반품 목록을 성공적으로 반환한다', async () => {
    server.use(
      http.get(returnsUrl, () => {
        return HttpResponse.json([mockReturnItem]);
      }),
    );

    const { result } = renderHook(() => useShopifyReturns(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].returnId).toBe('ret_001');
    expect(result.current.error).toBeNull();
    expect(result.current.hasApiKey).toBe(true);
  });

  it('반품이 없으면 빈 배열과 기본 pageInfo를 반환한다', async () => {
    const { result } = renderHook(() => useShopifyReturns(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    expect(result.current.data).toHaveLength(0);
    expect(result.current.pageInfo.hasNextPage).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('API 오류 시 에러 상태를 반환한다', async () => {
    server.use(
      http.get(returnsUrl, () => {
        return HttpResponse.json(
          { error: 'AUTH_ERROR', message: '인증 오류' },
          { status: 401 },
        );
      }),
    );

    const { result } = renderHook(() => useShopifyReturns(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    }, { timeout: 5000 });

    expect(result.current.error?.type).toBe('AUTH_ERROR');
  });

  it('enabled=false이면 데이터를 불러오지 않는다', async () => {
    const { result } = renderHook(() => useShopifyReturns({ enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toHaveLength(0);
  });
});

// ─── useShopifyReturnStats 테스트 ─────────────────────────────

describe('useShopifyReturnStats', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('반품 통계를 성공적으로 반환한다', async () => {
    server.use(
      http.get(returnsUrl, () => {
        return HttpResponse.json([
          { ...mockReturnItem, status: 'OPEN', totalRefunded: '10000' },
          { ...mockReturnItem, returnId: 'ret_002', status: 'CLOSED', totalRefunded: '20000' },
          { ...mockReturnItem, returnId: 'ret_003', status: 'CLOSED', totalRefunded: '30000' },
        ]);
      }),
    );

    const { result } = renderHook(() => useShopifyReturnStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    expect(result.current.stats.openCount).toBe(1);
    expect(result.current.stats.closedCount).toBe(2);
    expect(result.current.stats.totalCount).toBe(3);
    expect(result.current.stats.totalRefundedAmount).toBe(60000);
    expect(result.current.error).toBeNull();
    expect(result.current.hasApiKey).toBe(true);
  });

  it('API 오류 시 에러 상태와 기본 통계를 반환한다', async () => {
    server.use(
      http.get(returnsUrl, () => {
        return HttpResponse.json(
          { error: 'GRAPHQL_ERROR', message: 'GraphQL 오류' },
          { status: 500 },
        );
      }),
    );

    const { result } = renderHook(() => useShopifyReturnStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    expect(result.current.error).not.toBeNull();
    expect(result.current.stats.totalCount).toBe(0);
  });

  it('dateFrom 파라미터가 startDate로 변환되어 전달된다', async () => {
    let capturedUrl = '';
    server.use(
      http.get(returnsUrl, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json([]);
      }),
    );

    const { result } = renderHook(() => useShopifyReturnStats({ dateFrom: '2024-01-01' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    expect(capturedUrl).toContain('startDate=20240101');
  });
});
