"use client";

import { useCallback, useMemo } from "react";
import { format, subDays } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChannelId } from "@/shared/config";
import type { Order } from "@/entities/order";

type ChannelFilter = ChannelId | "all";

// v0와 동일한 상태 유니온
type OrderStatusFilter =
  | "신규"
  | "처리중"
  | "배송준비"
  | "배송중"
  | "완료"
  | "취소"
  | "반품";

const ORDER_STATUSES: OrderStatusFilter[] = [
  "신규",
  "처리중",
  "배송준비",
  "배송중",
  "완료",
  "취소",
  "반품",
];

// dateRange 문자열 → Qoo10 API 날짜 파라미터 변환
export function dateRangeToApiParams(dateRange: string): {
  SearchStartDate: string;
  SearchEndDate: string;
} {
  const today = new Date();
  const fmt = (d: Date): string => format(d, "yyyyMMdd");

  if (dateRange === "오늘") {
    return { SearchStartDate: fmt(today), SearchEndDate: fmt(today) };
  }
  if (dateRange === "7일") {
    return {
      SearchStartDate: fmt(subDays(today, 7)),
      SearchEndDate: fmt(today),
    };
  }
  if (dateRange === "30일") {
    return {
      SearchStartDate: fmt(subDays(today, 30)),
      SearchEndDate: fmt(today),
    };
  }
  if (dateRange === "90일") {
    return {
      SearchStartDate: fmt(subDays(today, 90)),
      SearchEndDate: fmt(today),
    };
  }

  // 'YYYY.MM.DD ~ YYYY.MM.DD' 또는 공백 없는 형식 직접 입력
  const normalized = dateRange.replace(/\s+/g, "");
  const match = normalized.match(/(\d{4}\.\d{2}\.\d{2})~(\d{4}\.\d{2}\.\d{2})/);
  if (match) {
    return {
      SearchStartDate: match[1].replace(/\./g, ""),
      SearchEndDate: match[2].replace(/\./g, ""),
    };
  }

  // fallback: 최근 30일
  return {
    SearchStartDate: fmt(subDays(today, 30)),
    SearchEndDate: fmt(today),
  };
}

interface UseOrderFilterResult {
  channelId: ChannelFilter;
  status: string;
  dateRange: string;
  search: string;
  page: number;
  apiDateParams: {
    SearchStartDate: string;
    SearchEndDate: string;
  };
  statusCounts: Record<string, number>;
  filteredOrders: Order[];
  setChannel: (id: string) => void;
  setStatus: (status: string) => void;
  setDateRange: (range: string) => void;
  setSearch: (value: string) => void;
  setPage: (page: number) => void;
}

export function useOrderFilter(allOrders: Order[]): UseOrderFilterResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  const channelId = (searchParams?.get("channel") ?? "all") as ChannelFilter;
  const status = searchParams?.get("status") ?? "전체";
  const dateRange = searchParams?.get("dateRange") ?? "7일";
  const search = searchParams?.get("search") ?? "";
  const page = Number.parseInt(searchParams?.get("page") ?? "1", 10);

  const updateUrl = useCallback(
    (updates: Record<string, string | null>): void => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`/orders?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setChannel = useCallback(
    (id: string): void => {
      updateUrl({
        channel: id === "all" ? null : id,
        status: null,
        page: "1",
      });
    },
    [updateUrl],
  );

  const setStatus = useCallback(
    (nextStatus: string): void => {
      updateUrl({
        status: nextStatus === "전체" ? null : nextStatus,
        page: "1",
      });
    },
    [updateUrl],
  );

  const setDateRange = useCallback(
    (range: string): void => {
      updateUrl({ dateRange: range === "7일" ? null : range });
    },
    [updateUrl],
  );

  const setSearch = useCallback(
    (value: string): void => {
      updateUrl({ search: value || null, page: "1" });
    },
    [updateUrl],
  );

  const setPage = useCallback(
    (nextPage: number): void => {
      updateUrl({ page: nextPage === 1 ? null : String(nextPage) });
    },
    [updateUrl],
  );

  const statusCounts = useMemo(() => {
    const base =
      channelId === "all"
        ? allOrders
        : allOrders.filter((order) => order.channelId === channelId);

    const counts: Record<string, number> = { 전체: base.length };
    ORDER_STATUSES.forEach((statusKey) => {
      counts[statusKey] = base.filter(
        (order) => order.status === statusKey,
      ).length;
    });
    counts["취소·반품"] = (counts["취소"] || 0) + (counts["반품"] || 0);
    return counts;
  }, [allOrders, channelId]);

  const filteredOrders = useMemo(() => {
    return allOrders
      .filter((order) => channelId === "all" || order.channelId === channelId)
      .filter((order) => {
        if (status === "전체") {
          return true;
        }
        if (status === "취소·반품") {
          return order.status === "취소" || order.status === "반품";
        }
        return order.status === status;
      })
      .filter((order) => {
        if (!search) {
          return true;
        }
        const searchLower = search.toLowerCase();
        const firstItemName = order.items[0]?.productName.toLowerCase() ?? "";
        const buyerName = order.buyerName?.toLowerCase?.() ?? "";

        return (
          order.channelOrderId.toLowerCase().includes(searchLower) ||
          firstItemName.includes(searchLower) ||
          buyerName.includes(searchLower)
        );
      });
  }, [allOrders, channelId, status, search]);

  return {
    channelId,
    status,
    dateRange,
    search,
    page,
    apiDateParams: dateRangeToApiParams(dateRange),
    statusCounts,
    filteredOrders,
    setChannel,
    setStatus,
    setDateRange,
    setSearch,
    setPage,
  };
}
