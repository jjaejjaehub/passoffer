/**
 * E2E: 채널 설정 페이지
 *
 * 실행:
 *   bun run test:e2e e2e/settings-channels.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('채널 설정', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/channels');
  });

  test('채널 설정 페이지가 렌더링된다', async ({ page }) => {
    await expect(page).toHaveURL(/.*settings\/channels.*/);
    await page.waitForLoadState('networkidle');

    // 채널 목록(Qoo10, Shopify 등)이 표시되어야 함
    const channelSection = page.locator(
      '[data-testid="channel-section"], .channel-card, text=Qoo10',
    );
    await expect(channelSection.first()).toBeVisible({ timeout: 10_000 });
  });

  test('API 키 입력 필드가 표시된다', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // API 키 입력 필드나 연결 버튼이 표시되어야 함
    const inputOrButton = page.locator(
      'input[placeholder*="API"], input[placeholder*="키"], button:has-text("연결"), button:has-text("저장")',
    );
    await expect(inputOrButton.first()).toBeVisible({ timeout: 10_000 });
  });
});
