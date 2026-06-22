import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/shared/mocks/server";
import { localHttp } from "./localHttp";

describe("localHttp", () => {
  describe("get", () => {
    it("GET 요청을 수행하고 data를 반환한다", async () => {
      server.use(
        http.get("/api/test/users", () => {
          return HttpResponse.json({ id: 1, name: "홍길동" });
        }),
      );

      const result = await localHttp.get<{ id: number; name: string }>(
        "/api/test/users",
      );

      expect(result).toEqual({ id: 1, name: "홍길동" });
    });

    it("쿼리 파라미터를 포함한 GET 요청을 수행한다", async () => {
      let capturedUrl = "";
      server.use(
        http.get("/api/test/search", ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ items: [] });
        }),
      );

      await localHttp.get("/api/test/search?keyword=test&page=1");

      expect(capturedUrl).toContain("keyword=test");
      expect(capturedUrl).toContain("page=1");
    });

    it("커스텀 헤더를 포함한 GET 요청을 수행한다", async () => {
      let capturedHeaders: Record<string, string> = {};
      server.use(
        http.get("/api/test/protected", ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ data: "secret" });
        }),
      );

      await localHttp.get("/api/test/protected", {
        headers: {
          "X-Custom-Token": "my-token",
        },
      });

      expect(capturedHeaders["x-custom-token"]).toBe("my-token");
    });

    it("404 응답 시 에러를 throw한다", async () => {
      server.use(
        http.get("/api/test/not-found", () => {
          return HttpResponse.json({ message: "Not Found" }, { status: 404 });
        }),
      );

      await expect(localHttp.get("/api/test/not-found")).rejects.toThrow();
    });

    it("500 응답 시 에러를 throw한다", async () => {
      server.use(
        http.get("/api/test/error", () => {
          return HttpResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
          );
        }),
      );

      await expect(localHttp.get("/api/test/error")).rejects.toThrow();
    });
  });

  describe("post", () => {
    it("POST 요청을 수행하고 body를 전송한다", async () => {
      let capturedBody: unknown = null;
      server.use(
        http.post("/api/test/create", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ id: 1, ...(capturedBody as object) });
        }),
      );

      const body = { name: "새 주문", status: "신규" };
      const result = await localHttp.post<{
        id: number;
        name: string;
        status: string;
      }>("/api/test/create", body);

      expect(capturedBody).toEqual(body);
      expect(result.id).toBe(1);
      expect(result.name).toBe("새 주문");
    });

    it("POST 요청 오류 시 에러를 throw한다", async () => {
      server.use(
        http.post("/api/test/fail", () => {
          return HttpResponse.json({ error: "FORBIDDEN" }, { status: 403 });
        }),
      );

      await expect(localHttp.post("/api/test/fail", {})).rejects.toThrow();
    });
  });

  describe("put", () => {
    it("PUT 요청을 수행하고 body를 전송한다", async () => {
      let capturedBody: unknown = null;
      server.use(
        http.put("/api/test/update/1", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ success: true });
        }),
      );

      await localHttp.put("/api/test/update/1", { name: "수정됨" });

      expect(capturedBody).toEqual({ name: "수정됨" });
    });
  });

  describe("delete", () => {
    it("DELETE 요청을 수행한다", async () => {
      let calledDelete = false;
      server.use(
        http.delete("/api/test/remove/1", () => {
          calledDelete = true;
          return HttpResponse.json({ success: true });
        }),
      );

      await localHttp.delete("/api/test/remove/1");

      expect(calledDelete).toBe(true);
    });
  });
});
