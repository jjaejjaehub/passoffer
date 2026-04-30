/**
 * E2E: 로그인 페이지
 *
 * 실행:
 *   bun run test:e2e e2e/login.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('로그인', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('로그인 페이지가 렌더링된다', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('이메일 형식이 올바르지 않으면 에러 메시지가 표시된다', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 유효성 검사 에러 확인
    await expect(
      page.locator('text=올바른 이메일, [role="alert"], .chakra-form__error-message').first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('잘못된 비밀번호로 로그인하면 에러 메시지가 표시된다', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // 서버 에러 메시지 확인 (Alert 컴포넌트)
    await expect(
      page.locator('[role="alert"], [data-status="error"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('인증되지 않은 사용자는 /orders 접근 시 로그인 페이지로 리다이렉트된다', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/.*login.*/, { timeout: 5_000 });
  });
});
