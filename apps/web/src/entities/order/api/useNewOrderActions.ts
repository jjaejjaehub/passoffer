'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api';
import { newOrdersQueries } from './newOrdersQueries';
import { dispatchQueries } from './dispatchQueries';
import { ordersQueries } from './ordersQueries';

export interface DispatchResultItem {
  orderId: string;
  ok: boolean;
  message?: string;
}

export interface DispatchOrdersResult {
  totalRequested: number;
  totalDispatched: number;
  skipped: number;
  results: DispatchResultItem[];
}

export interface DispatchOrdersInput {
  orderIds: string[];
  reason?: string;
}

function invalidateOrderViews(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: newOrdersQueries.all() });
  void qc.invalidateQueries({ queryKey: dispatchQueries.all() });
  void qc.invalidateQueries({ queryKey: ordersQueries.all() });
}

export function useDispatchOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DispatchOrdersInput): Promise<DispatchOrdersResult> => {
      return await http.post<DispatchOrdersResult>('/api/new-orders/dispatch', input);
    },
    onSuccess: () => invalidateOrderViews(qc),
  });
}

export interface CopyOrderInput {
  orderId: string;
}
export interface CopyOrderResult {
  orderId: string;
}

export function useCopyOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CopyOrderInput): Promise<CopyOrderResult> => {
      return await http.post<CopyOrderResult>('/api/new-orders/copy', input);
    },
    onSuccess: () => invalidateOrderViews(qc),
  });
}

export interface DeleteOrdersInput {
  orderIds: string[];
}
export interface DeleteOrdersResult {
  totalRequested: number;
  totalDeleted: number;
  skipped: number;
  results: Array<{ orderId: string; ok: boolean; message?: string }>;
}

export function useDeleteOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteOrdersInput): Promise<DeleteOrdersResult> => {
      return await http.post<DeleteOrdersResult>('/api/new-orders/delete', input);
    },
    onSuccess: () => invalidateOrderViews(qc),
  });
}

export interface SplitOrderInput {
  orderId: string;
  splits: Array<{ itemIds: string[] }>;
}
export interface SplitOrderResult {
  parentOrderId: string;
  childOrderIds: string[];
}

export function useSplitOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SplitOrderInput): Promise<SplitOrderResult> => {
      return await http.post<SplitOrderResult>('/api/new-orders/split', input);
    },
    onSuccess: () => invalidateOrderViews(qc),
  });
}

export interface BundleOrdersInput {
  orderIds: string[];
  primaryOrderId?: string;
}
export interface BundleOrdersResult {
  bundleNumber: string;
  orderIds: string[];
}

export function useBundleOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BundleOrdersInput): Promise<BundleOrdersResult> => {
      return await http.post<BundleOrdersResult>('/api/new-orders/bundle', input);
    },
    onSuccess: () => invalidateOrderViews(qc),
  });
}
