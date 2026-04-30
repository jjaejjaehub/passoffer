import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/shared/mocks/test-utils';
import { useShopifyInventory } from './shopifyInventoryQueries';

vi.mock('@/entities/channel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/channel')>();
  return {
    ...actual,
    useChannelApiKey: (channelId: string) => {
      if (channelId === 'shopify') {
        return {
          keys: {
            shopDomain: 'test.myshopify.com',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            expireAt: Math.floor(Date.now() / 1000) + 3600,
          },
          hasKey: true,
          isLoading: false,
          saveKeys: vi.fn(),
          removeKeys: vi.fn(),
        };
      }
      return { keys: null, hasKey: false, isLoading: false, saveKeys: vi.fn(), removeKeys: vi.fn() };
    },
    useChannelUuid: (channelId: string) =>
      channelId === 'shopify' ? 'test-channel-uuid' : null,
  };
});

// ─── MSW 핸들러 추가 ─────────────────────────────────────────

const inventoryHandler = http.get('/api/inventory', () => {
  return HttpResponse.json({
    items: [
      {
        productId: 'gid://shopify/Product/1',
        title: '테스트 상품',
        handle: 'test-product',
        status: 'ACTIVE',
        imageUrl: '',
        variants: [
          {
            variantId: 'gid://shopify/ProductVariant/1',
            variantTitle: 'Default Title',
            sku: 'TEST-001',
            price: '50000',
            inventoryItemId: 'gid://shopify/InventoryItem/1',
            inventoryQuantity: 100,
            tracked: true,
            selectedOptions: [{ name: 'Title', value: 'Default Title' }],
          },
        ],
      },
    ],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

describe('useShopifyInventory', () => {
  beforeEach(() => {
    server.resetHandlers();
    server.use(inventoryHandler);
  });

  it('API 키가 있을 때 재고 목록을 가져온다', async () => {
    const { result } = renderHook(() => useShopifyInventory(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].title).toBe('테스트 상품');
    expect(result.current.data[0].variants).toHaveLength(1);
    expect(result.current.data[0].variants[0].inventoryQuantity).toBe(100);
    expect(result.current.error).toBeNull();
    expect(result.current.hasApiKey).toBe(true);
  });

  it('variant 정보가 올바르게 매핑된다', async () => {
    const { result } = renderHook(() => useShopifyInventory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstVariant = result.current.data[0].variants[0];
    expect(firstVariant.sku).toBe('TEST-001');
    expect(firstVariant.tracked).toBe(true);
    expect(firstVariant.price).toBe('50000');
  });

  it('API 오류 시 에러 상태를 반환한다', async () => {
    server.use(
      http.get('/api/inventory', () => {
        return HttpResponse.json(
          { error: 'AUTH_ERROR', message: 'Shopify 인증 오류' },
          { status: 401 },
        );
      }),
    );

    const { result } = renderHook(() => useShopifyInventory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    }, { timeout: 5000 });

    expect(result.current.data).toHaveLength(0);
  });
});
