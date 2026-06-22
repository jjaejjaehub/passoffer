"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { format, subDays } from "date-fns";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import type { Order } from "@oms/types";

export type { Order as RakutenOrderItem };

export interface RakutenOrderPagination {
  requestPage: number;
  resultPage: number;
  pageCount: number;
  totalRecordsFound: number;
}

export interface RakutenOrderQueryParams {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  enabled?: boolean;
}

export interface RakutenOrderQueryResult {
  orders: Order[];
  isLoading: boolean;
  error: { message: string } | null;
  hasApiKey: boolean;
  refetch: () => void;
}

export const rakutenOrderQueries = {
  all: () => ["rakuten", "orders"] as const,
  list: (params: Omit<RakutenOrderQueryParams, "enabled">) =>
    [...rakutenOrderQueries.all(), params] as const,
};

function toRakutenDate(date: Date): string {
  return format(date, "yyyyMMdd");
}

export function useRakutenOrders(
  params: RakutenOrderQueryParams = {},
): RakutenOrderQueryResult {
  const { hasKey } = useChannelApiKey("rakuten");
  const channelUuid = useChannelUuid("rakuten");

  const today = new Date();
  const {
    dateFrom = toRakutenDate(subDays(today, 30)),
    dateTo = toRakutenDate(today),
    status,
    enabled = true,
  } = params;

  const query = useQuery({
    queryKey: rakutenOrderQueries.list({ dateFrom, dateTo, status }),
    queryFn: async (): Promise<Order[]> => {
      if (!channelUuid) {
        throw Object.assign(new Error("NO_API_KEY"), {
          response: {
            data: {
              error: "NO_API_KEY",
              message:
                "Rakuten 채널이 연결되지 않았습니다. 채널 설정에서 등록해 주세요.",
            },
          },
        });
      }

      const searchParams = new URLSearchParams({
        channelId: channelUuid,
        startDate: dateFrom,
        endDate: dateTo,
      });
      if (status) searchParams.set("status", status);

      return http.get<Order[]>(`/api/orders?${searchParams.toString()}`);
    },
    enabled: hasKey && !!channelUuid && enabled,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const error = query.error
    ? {
        message: isAxiosError<{ message?: string }>(query.error)
          ? (query.error.response?.data?.message ??
            "주문을 불러오는 중 오류가 발생했습니다.")
          : "주문을 불러오는 중 오류가 발생했습니다.",
      }
    : null;

  return {
    orders: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading && hasKey && enabled,
    error,
    hasApiKey: hasKey,
    refetch: () => {
      void query.refetch();
    },
  };
}
