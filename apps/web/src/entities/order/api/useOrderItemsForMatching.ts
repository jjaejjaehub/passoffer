'use client';

import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api';

export interface OrderItemForMatching {
  id: string;
  channelItemCode: string | null;
  channelItemTitle: string | null;
  channelOption: string | null;
  channelOptionCode: string | null;
  orderQty: number;
  unitPrice: string | number | null;
  totalPrice: string | number | null;
  skuId: string | null;
  skuCode: string | null;
  skuName: string | null;
  outputQty: number;
}

export interface OrderItemsForMatchingResult {
  items: OrderItemForMatching[];
}

export const orderItemsForMatchingQueries = {
  all: () => ['order-items-for-matching'] as const,
  byOrder: (orderId: string) =>
    [...orderItemsForMatchingQueries.all(), orderId] as const,
};

export function useOrderItemsForMatching(orderId: string | null) {
  return useQuery({
    queryKey: orderId
      ? orderItemsForMatchingQueries.byOrder(orderId)
      : ([...orderItemsForMatchingQueries.all(), 'none'] as const),
    queryFn: () =>
      http.get<OrderItemsForMatchingResult>(`/api/orders/${orderId}/items`),
    enabled: Boolean(orderId),
    staleTime: 15 * 1000,
  });
}
