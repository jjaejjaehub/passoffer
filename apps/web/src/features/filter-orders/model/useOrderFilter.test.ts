import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { dateRangeToApiParams, useOrderFilter } from "./useOrderFilter";
import type { Order } from "@/entities/order";
import { format, subDays } from "date-fns";

// ─── next/navigation 모킹 ────────────────────────────────────
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/orders",
}));

// ─── 테스트용 주문 목 데이터 ──────────────────────────────────
const makeOrder = (overrides: Partial<Order>): Order => ({
  id: "order-1",
  channelOrderId: "CH-001",
  channelId: "shopify",
  status: "신규",
  buyerName: "홍길동",
  buyerPhone: "010-0000-0000",
  shippingAddress: "서울특별시",
  items: [
    {
      id: "item-1",
      productName: "테스트 상품",
      quantity: 1,
      unitPrice: 10000,
      totalPrice: 10000,
    },
  ],
  currency: "KRW",
  originalAmount: 10000,
  krwAmount: 10000,
  totalAmount: 10000,
  paymentMethod: "card",
  orderedAt: "2024-01-15T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z",
  ...overrides,
});

const MOCK_ORDERS: Order[] = [
  makeOrder({
    id: "order-1",
    channelOrderId: "SHOPIFY-001",
    channelId: "shopify",
    status: "신규",
    buyerName: "홍길동",
    items: [
      {
        id: "i1",
        productName: "Shopify 상품 A",
        quantity: 1,
        unitPrice: 50000,
        totalPrice: 50000,
      },
    ],
  }),
  makeOrder({
    id: "order-2",
    channelOrderId: "QOO10-001",
    channelId: "qoo10",
    status: "배송중",
    buyerName: "김철수",
    items: [
      {
        id: "i2",
        productName: "Qoo10 상품 B",
        quantity: 2,
        unitPrice: 30000,
        totalPrice: 60000,
      },
    ],
    currency: "KRW",
  }),
  makeOrder({
    id: "order-3",
    channelOrderId: "SHOPIFY-002",
    channelId: "shopify",
    status: "취소",
    buyerName: "이영희",
    items: [
      {
        id: "i3",
        productName: "Shopify 상품 C",
        quantity: 1,
        unitPrice: 20000,
        totalPrice: 20000,
      },
    ],
  }),
];

// ─── dateRangeToApiParams 순수 함수 테스트 ───────────────────

describe("dateRangeToApiParams", () => {
  it("오늘 → 오늘 날짜 반환", () => {
    const today = format(new Date(), "yyyyMMdd");
    const result = dateRangeToApiParams("오늘");
    expect(result.SearchStartDate).toBe(today);
    expect(result.SearchEndDate).toBe(today);
  });

  it("7일 → 7일 전부터 오늘까지 반환", () => {
    const today = format(new Date(), "yyyyMMdd");
    const sevenDaysAgo = format(subDays(new Date(), 7), "yyyyMMdd");
    const result = dateRangeToApiParams("7일");
    expect(result.SearchStartDate).toBe(sevenDaysAgo);
    expect(result.SearchEndDate).toBe(today);
  });

  it("30일 → 30일 전부터 오늘까지 반환", () => {
    const today = format(new Date(), "yyyyMMdd");
    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyyMMdd");
    const result = dateRangeToApiParams("30일");
    expect(result.SearchStartDate).toBe(thirtyDaysAgo);
    expect(result.SearchEndDate).toBe(today);
  });

  it("90일 → 90일 전부터 오늘까지 반환", () => {
    const today = format(new Date(), "yyyyMMdd");
    const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyyMMdd");
    const result = dateRangeToApiParams("90일");
    expect(result.SearchStartDate).toBe(ninetyDaysAgo);
    expect(result.SearchEndDate).toBe(today);
  });

  it("날짜 범위 직접 입력 → 파싱하여 반환", () => {
    const result = dateRangeToApiParams("2024.01.01 ~ 2024.01.31");
    expect(result.SearchStartDate).toBe("20240101");
    expect(result.SearchEndDate).toBe("20240131");
  });

  it("잘못된 형식 → fallback으로 30일 기간 반환", () => {
    const today = format(new Date(), "yyyyMMdd");
    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyyMMdd");
    const result = dateRangeToApiParams("invalid");
    expect(result.SearchStartDate).toBe(thirtyDaysAgo);
    expect(result.SearchEndDate).toBe(today);
  });
});

// ─── useOrderFilter 훅 테스트 ────────────────────────────────

describe("useOrderFilter", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("기본값이 올바르게 반환된다", () => {
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    expect(result.current.channelId).toBe("all");
    expect(result.current.status).toBe("전체");
    expect(result.current.dateRange).toBe("7일");
    expect(result.current.search).toBe("");
    expect(result.current.page).toBe(1);
  });

  it("전체 주문이 필터 없이 반환된다", () => {
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    expect(result.current.filteredOrders).toHaveLength(3);
  });

  it("채널 필터 적용 시 해당 채널 주문만 반환된다", () => {
    mockSearchParams = new URLSearchParams("channel=shopify");
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    expect(result.current.channelId).toBe("shopify");
    expect(result.current.filteredOrders).toHaveLength(2);
    expect(
      result.current.filteredOrders.every((o) => o.channelId === "shopify"),
    ).toBe(true);
  });

  it("상태 필터 적용 시 해당 상태 주문만 반환된다", () => {
    mockSearchParams = new URLSearchParams("status=신규");
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    expect(result.current.status).toBe("신규");
    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].channelOrderId).toBe("SHOPIFY-001");
  });

  it("취소·반품 필터가 취소와 반품 주문을 모두 포함한다", () => {
    mockSearchParams = new URLSearchParams("status=취소·반품");
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    const statuses = result.current.filteredOrders.map((o) => o.status);
    expect(statuses.every((s) => s === "취소" || s === "반품")).toBe(true);
  });

  it("검색어 필터가 구매자 이름으로 동작한다", () => {
    mockSearchParams = new URLSearchParams("search=홍길동");
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].buyerName).toBe("홍길동");
  });

  it("검색어 필터가 상품명으로 동작한다", () => {
    mockSearchParams = new URLSearchParams("search=Qoo10+상품");
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].channelOrderId).toBe("QOO10-001");
  });

  it("statusCounts가 채널별 상태 건수를 올바르게 계산한다", () => {
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    expect(result.current.statusCounts["전체"]).toBe(3);
    expect(result.current.statusCounts["신규"]).toBe(1);
    expect(result.current.statusCounts["배송중"]).toBe(1);
    expect(result.current.statusCounts["취소"]).toBe(1);
  });

  it("setChannel 호출 시 URL이 업데이트된다", () => {
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    act(() => {
      result.current.setChannel("shopify");
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("channel=shopify"),
      { scroll: false },
    );
  });

  it("setStatus 호출 시 URL이 업데이트된다", () => {
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    act(() => {
      result.current.setStatus("신규");
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("status=%EC%8B%A0%EA%B7%9C"),
      { scroll: false },
    );
  });

  it('setStatus "전체" 호출 시 status 파라미터를 제거한다', () => {
    mockSearchParams = new URLSearchParams("status=신규");
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    act(() => {
      result.current.setStatus("전체");
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("status=");
  });

  it("setPage 호출 시 URL에 page 파라미터가 추가된다", () => {
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    act(() => {
      result.current.setPage(3);
    });

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=3"), {
      scroll: false,
    });
  });

  it("setPage(1) 호출 시 page 파라미터를 제거한다", () => {
    mockSearchParams = new URLSearchParams("page=3");
    const { result } = renderHook(() => useOrderFilter(MOCK_ORDERS));

    act(() => {
      result.current.setPage(1);
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("page=");
  });
});
