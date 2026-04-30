import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/shared/mocks/test-utils';
import { useChannelApiKey } from './useChannelApiKey';

// ─── useChannelApiKey 테스트 ──────────────────────────────────

describe('useChannelApiKey', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('qoo10 채널', () => {
    it('서버에서 Qoo10 인증키를 불러온다', async () => {
      const { result } = renderHook(() => useChannelApiKey('qoo10'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.hasKey).toBe(true);
      expect(result.current.keys).not.toBeNull();
      expect(result.current.keys?.certificationKey).toBe('test-cert-key');
    });

    it('404 응답 시 keys=null, hasKey=false를 반환한다', async () => {
      server.use(
        http.get('/api/channels/qoo10/credential', () => {
          return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
        }),
      );

      const { result } = renderHook(() => useChannelApiKey('qoo10'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.hasKey).toBe(false);
      expect(result.current.keys).toBeNull();
    });

    it('401 응답 시 keys=null, hasKey=false를 반환한다', async () => {
      server.use(
        http.get('/api/channels/qoo10/credential', () => {
          return HttpResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }),
      );

      const { result } = renderHook(() => useChannelApiKey('qoo10'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.hasKey).toBe(false);
      expect(result.current.keys).toBeNull();
    });
  });

  describe('shopify 채널', () => {
    it('서버에서 Shopify 인증키를 불러온다', async () => {
      const { result } = renderHook(() => useChannelApiKey('shopify'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.hasKey).toBe(true);
      expect(result.current.keys).not.toBeNull();
      expect(result.current.keys?.shopDomain).toBe('test.myshopify.com');
      expect(result.current.keys?.accessToken).toBe('test-access-token');
    });

    it('404 응답 시 keys=null, hasKey=false를 반환한다', async () => {
      server.use(
        http.get('/api/channels/shopify/credential', () => {
          return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
        }),
      );

      const { result } = renderHook(() => useChannelApiKey('shopify'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.hasKey).toBe(false);
      expect(result.current.keys).toBeNull();
    });
  });

  describe('미지원 채널', () => {
    it('rakuten은 hasKey=false를 반환한다', async () => {
      const { result } = renderHook(() => useChannelApiKey('rakuten'), {
        wrapper: createWrapper(),
      });

      // rakuten은 로딩 없이 즉시 false 반환
      expect(result.current.hasKey).toBe(false);
      expect(result.current.keys).toBeNull();
    });
  });
});
