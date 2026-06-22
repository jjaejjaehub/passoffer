'use client';

import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api';

export interface NewOrderItem {
  id: string;
  channelItemCode: string | null;
  channelItemTitle: string | null;
  channelOption: string | null;
  channelOptionCode: string | null;
  orderQty: number;
  unitPrice: string | null;
  totalPrice: string | null;
}

export interface NewOrderItemsResult {
  items: NewOrderItem[];
}

export const newOrderItemsQueries = {
  all: () => ['new-order-items'] as const,
  detail: (orderId: string) => ['new-order-items', orderId] as const,
};

export function useNewOrderItems(orderId: string | null) {
  return useQuery({
    queryKey: newOrderItemsQueries.detail(orderId ?? ''),
    queryFn: async (): Promise<NewOrderItemsResult> =>
      await http.get<NewOrderItemsResult>(`/api/new-orders/${orderId}/items`),
    enabled: !!orderId,
  });
}
