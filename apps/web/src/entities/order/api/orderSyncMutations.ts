'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api';

// ─── 서버 응답 타입 ──────────────────────────────────────────────

export type ChannelKey = 'qoo10' | 'shopify' | 'shopee' | 'rakuten';

export interface ChannelOpResult {
  channelId: string;
  channelKey: ChannelKey;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ channelOrderId: string; message: string }>;
}

export interface CollectResult {
  totalProcessed: number;
  totalInserted: number;
  totalUpdated: number;
  channels: ChannelOpResult[];
}

export interface SyncResult {
  totalProcessed: number;
  totalUpdated: number;
  totalSkipped: number;
  channels: ChannelOpResult[];
}

export interface QuickCollectResult {
  collect: CollectResult;
  sync: SyncResult;
}

// ─── 요청 타입 ──────────────────────────────────────────────────

export interface CollectOrdersInput {
  channelIds: string[];
  sinceDate: string; // ISO datetime
  untilDate?: string;
}

export interface SyncOrdersInput {
  channelIds: string[];
  sinceDate: string;
  untilDate?: string;
}

export interface QuickCollectInput {
  channelIds?: string[];
}

// ─── 공통 invalidation ──────────────────────────────────────────

/** 주문 관련 쿼리 전반 invalidate — 페이지별 쿼리 키 prefix 일괄 무효화 */
function invalidateAllOrderQueries(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: ['orders'] });
  void qc.invalidateQueries({ queryKey: ['payments'] });
  void qc.invalidateQueries({ queryKey: ['new-orders'] });
  void qc.invalidateQueries({ queryKey: ['dispatch'] });
  void qc.invalidateQueries({ queryKey: ['shipping'] });
  void qc.invalidateQueries({ queryKey: ['all-orders'] });
  void qc.invalidateQueries({ queryKey: ['claims'] });
}

// ─── Mutations ──────────────────────────────────────────────────

/** 채널 다중 수집 — POST /api/orders/collect */
export function useCollectOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CollectOrdersInput): Promise<CollectResult> => {
      return await http.post<CollectResult>('/api/orders/collect', input);
    },
    onSuccess: () => {
      invalidateAllOrderQueries(queryClient);
    },
  });
}

/** 채널 다중 동기화 — POST /api/orders/sync */
export function useSyncOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SyncOrdersInput): Promise<SyncResult> => {
      return await http.post<SyncResult>('/api/orders/sync', input);
    },
    onSuccess: () => {
      invalidateAllOrderQueries(queryClient);
    },
  });
}

/** 퀵수집 — POST /api/orders/quick-collect (user_settings.lookbackDays 기반) */
export function useQuickCollect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input?: QuickCollectInput): Promise<QuickCollectResult> => {
      return await http.post<QuickCollectResult>('/api/orders/quick-collect', input ?? {});
    },
    onSuccess: () => {
      invalidateAllOrderQueries(queryClient);
    },
  });
}
