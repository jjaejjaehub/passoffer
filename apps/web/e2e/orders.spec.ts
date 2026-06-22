/**
 * E2E: 주문 관리 페이지
 *
 * 사전 조건:
 * - 개발 서버가 localhost:3000에서 실행 중이어야 한다
 * - 채널 API 키가 설정되어 있어야 한다 (또는 모킹)
 *
 * 실행:
 *   bun run test:e2e e2e/orders.spec.ts
 */
import { test, expect } from "@playwright/test";

test.describe("주문 관리 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders");
  });

  test("주문 페이지가 로드된다", async ({ page }) => {
    // 페이지 타이틀 또는 헤딩 확인
    await expect(page).toHaveURL(/.*orders.*/);
    await expect(
      page.locator('h1, [data-testid="page-title"]').first(),
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("채널 탭이 표시된다", async ({ page }) => {
    // Qoo10 또는 Shopify 탭이 표시되는지 확인
    const tabs = page.locator('[role="tab"], [data-testid="channel-tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });
  });

  test("로딩 상태 후 주문 목록이 표시된다", async ({ page }) => {
    // 스켈레톤 또는 스피너가 사라진 후 테이블이 표시됨
    await page.waitForLoadState("networkidle");

    // 테이블 또는 빈 상태 중 하나가 표시되어야 함
    const table = page.locator('table, [data-testid="order-table"]');
    const emptyState = page.locator(
      '[data-testid="empty-state"], text=주문이 없습니다',
    );

    await expect(table.or(emptyState).first()).toBeVisible({ timeout: 15_000 });
  });
});
