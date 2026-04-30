/**
 * E2E 인증 Setup
 *
 * 다른 테스트 전에 실행되어 로그인 상태를 저장한다.
 * playwright.config.ts의 `projects[].dependencies`에 등록해 사용한다.
 *
 * 사용 방법:
 *   playwright.config.ts에 아래처럼 setup 프로젝트 추가:
 *
 *   projects: [
 *     {
 *       name: 'setup',
 *       testMatch: /auth\.setup\.ts/,
 *     },
 *     {
 *       name: 'chromium',
 *       use: {
 *         ...devices['Desktop Chrome'],
 *         storageState: 'e2e/.auth/user.json',
 *       },
 *       dependencies: ['setup'],
 *     },
 *   ],
 */
import { test as setup } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('로그인 상태 저장', async ({ page }) => {
  await page.goto('/login');

  // 테스트 계정 로그인
  const email = process.env.E2E_TEST_EMAIL ?? 'test@example.com';
  const password = process.env.E2E_TEST_PASSWORD ?? 'test1234!';

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // 로그인 성공 후 리다이렉트 대기
  await page.waitForURL('/orders', { timeout: 10_000 });

  // 인증 상태 저장
  await page.context().storageState({ path: authFile });
});
