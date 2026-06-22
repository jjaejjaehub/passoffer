import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/shared/mocks/server";
import { createWrapper } from "@/shared/mocks/test-utils";
import { TEST_CHANNEL_UUID } from "@/shared/mocks/handlers";
import { useShopifyProducts } from "./shopifyProductQueries";

vi.mock("@/entities/channel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/channel")>();
  return {
    ...actual,
    useChannelApiKey: (channelId: string) => {
      if (channelId === "shopify") {
        return {
          keys: {},
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
    useChannelUuid: (channelId: string) => {
      if (channelId === "shopify") return TEST_CHANNEL_UUID;
      return null;
    },
  };
});

describe("useShopifyProducts", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("API 키가 있을 때 상품 목록을 가져온다", async () => {
    const { result } = renderHook(() => useShopifyProducts(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].title).toBe("테스트 상품");
    expect(result.current.data[0].status).toBe("active");
    expect(result.current.error).toBeNull();
  });

  it("상품 목록에 pageInfo가 포함된다", async () => {
    const { result } = renderHook(() => useShopifyProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pageInfo).toEqual({
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("status 필터가 쿼리 파라미터에 포함된다", async () => {
    let capturedUrl = "";
    server.use(
      http.get("/api/products", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json([]);
      }),
    );

    const { result } = renderHook(
      () => useShopifyProducts({ status: "active" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(capturedUrl).toContain("itemStatus=active");
  });

  it("API 오류 시 에러 상태를 반환한다", async () => {
    server.use(
      http.get("/api/products", () => {
        return HttpResponse.json(
          { error: "AUTH_ERROR", message: "인증 오류" },
          { status: 401 },
        );
      }),
    );

    const { result } = renderHook(() => useShopifyProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
      },
      { timeout: 5000 },
    );

    expect(result.current.error?.type).toBe("AUTH_ERROR");
  });

  it("hasApiKey가 true를 반환한다", async () => {
    const { result } = renderHook(() => useShopifyProducts(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasApiKey).toBe(true);
  });
});
