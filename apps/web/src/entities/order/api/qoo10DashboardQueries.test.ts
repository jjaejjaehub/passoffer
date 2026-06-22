import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/shared/mocks/server";
import { createWrapper } from "@/shared/mocks/test-utils";
import {
  useQoo10Claims,
  useQoo10MonthlyDashboard,
} from "./qoo10DashboardQueries";

// ─── useChannelApiKey 모킹 ────────────────────────────────────
vi.mock("@/entities/channel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/channel")>();
  return {
    ...actual,
    useChannelApiKey: (channelId: string) => {
      if (channelId === "qoo10") {
        return {
          keys: { certificationKey: "test-cert-key", sellerId: "test-seller" },
          hasKey: true,
          isLoading: false,
          saveKeys: vi.fn(),
          removeKeys: vi.fn(),
        };
      }
      return {
        keys: null,
        hasKey: false,
        isLoading: false,
        saveKeys: vi.fn(),
        removeKeys: vi.fn(),
      };
    },
    adaptQoo10Orders: actual.adaptQoo10Orders,
    adaptQoo10Order: actual.adaptQoo10Order,
  };
});

// ─── useQoo10MonthlyDashboard 테스트 ─────────────────────────

describe("useQoo10MonthlyDashboard", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("API 키가 있을 때 대시보드 데이터를 반환한다", async () => {
    const { result } = renderHook(() => useQoo10MonthlyDashboard(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasApiKey).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(typeof result.current.orderCount).toBe("number");
    expect(typeof result.current.totalSalesKrw).toBe("number");
    expect(result.current.error).toBeNull();
  });

  it("주문 데이터가 없으면 orderCount=0, totalSalesKrw=0을 반환한다", async () => {
    server.use(
      http.post("/api/qoo10/shipping", () => {
        return HttpResponse.json({
          ResultCode: 0,
          ResultMsg: "OK",
          ResultObject: [],
        });
      }),
    );

    const { result } = renderHook(() => useQoo10MonthlyDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.orderCount).toBe(0);
    expect(result.current.totalSalesKrw).toBe(0);
  });

  it("API 오류 시 에러 상태를 반환한다", async () => {
    server.use(
      http.post("/api/qoo10/shipping", () => {
        return HttpResponse.json(
          { error: "AUTH_ERROR", message: "인증 오류" },
          { status: 401 },
        );
      }),
    );

    const { result } = renderHook(() => useQoo10MonthlyDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.error).not.toBeNull();
  });
});

// ─── useQoo10Claims 테스트 ────────────────────────────────────

describe("useQoo10Claims", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  const defaultParams = {
    ClaimStat: "",
    search_Sdate: "20240101",
    search_Edate: "20240131",
    search_condition: "2" as const,
  };

  it("클레임 목록을 성공적으로 가져온다", async () => {
    server.use(
      http.post("/api/qoo10/claim", () => {
        return HttpResponse.json({
          ResultCode: 0,
          ResultMsg: "OK",
          ResultObject: [
            {
              PackNo: "PACK-001",
              OrderNo: "ORD-001",
              ClaimStat: "1",
              ClaimStatStr: "교환신청",
              ItemTitle: "테스트 상품",
            },
          ],
        });
      }),
    );

    const { result } = renderHook(() => useQoo10Claims(defaultParams), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("클레임이 없으면 빈 배열을 반환한다", async () => {
    server.use(
      http.post("/api/qoo10/claim", () => {
        return HttpResponse.json({
          ResultCode: 0,
          ResultMsg: "OK",
          ResultObject: [],
        });
      }),
    );

    const { result } = renderHook(() => useQoo10Claims(defaultParams), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toHaveLength(0);
  });

  it("API 오류 시 에러 상태를 반환한다", async () => {
    server.use(
      http.post("/api/qoo10/claim", () => {
        return HttpResponse.json(
          { error: "SERVER_ERROR", message: "서버 오류" },
          { status: 500 },
        );
      }),
    );

    const { result } = renderHook(() => useQoo10Claims(defaultParams), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.error).not.toBeNull();
  });
});
