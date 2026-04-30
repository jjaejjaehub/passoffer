import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/shared/mocks/test-utils';
import { useQoo10Products } from './qoo10ProductQueries';

vi.mock('@/entities/channel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/channel')>();
  return {
    ...actual,
    useChannelApiKey: (channelId: string) => {
      if (channelId === 'qoo10') {
        return {
          keys: {
            certificationKey: 'test-cert-key',
            sellerId: 'test-seller',
          },
          hasKey: true,
          isLoading: false,
          saveKeys: vi.fn(),
          removeKeys: vi.fn(),
        };
      }
      return { keys: null, hasKey: false, isLoading: false, saveKeys: vi.fn(), removeKeys: vi.fn() };
    },
    adaptQoo10Orders: actual.adaptQoo10Orders,
    adaptQoo10Order: actual.adaptQoo10Order,
    useChannelUuid: (channelId: string) =>
      channelId === 'qoo10' ? 'test-channel-uuid' : null,
  };
});

describe('useQoo10Products', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('API 키가 있을 때 상품 목록을 가져온다', async () => {
    const { result } = renderHook(
      () => useQoo10Products({ ItemStatus: 'S2', Page: '1' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.hasApiKey).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('API 오류 시 에러 상태를 반환한다', async () => {
    server.use(
      http.get('/api/products', () => {
        return HttpResponse.json(
          { error: 'AUTH_ERROR', message: 'Qoo10 인증 오류' },
          { status: 401 },
        );
      }),
    );

    const { result } = renderHook(
      () => useQoo10Products({ ItemStatus: 'S2', Page: '1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    }, { timeout: 5000 });

    expect(result.current.error?.type).toBe('AUTH_ERROR');
  });

  it('enabled: false 시 쿼리를 실행하지 않는다', () => {
    const { result } = renderHook(
      () => useQoo10Products({ ItemStatus: 'S2', Page: '1', enabled: false }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toHaveLength(0);
  });

  it('hasApiKey가 true를 반환한다 (mock key 설정됨)', () => {
    const { result } = renderHook(
      () => useQoo10Products({ ItemStatus: 'S2', Page: '1' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.hasApiKey).toBe(true);
  });
});
