import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정
 *
 * 실행 방법:
 *   bun run test:e2e           # 헤드리스 실행
 *   bun run test:e2e:ui        # UI 모드 (인터랙티브)
 *   npx playwright show-report  # 마지막 결과 리포트
 *
 * 처음 실행 시 브라우저 설치 필요:
 *   npx playwright install
 */

export default defineConfig({
  testDir: './e2e',

  // 각 테스트 타임아웃
  timeout: 30 * 1000,

  // expect 타임아웃
  expect: {
    timeout: 5000,
  },

  // 실패 시 재시도 (CI에서만)
  retries: process.env.CI ? 2 : 0,

  // 병렬 실행
  workers: process.env.CI ? 1 : undefined,

  // 리포터
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    // 테스트 대상 URL
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',

    // 실패 시 트레이스 수집
    trace: 'on-first-retry',

    // 스크린샷 (실패 시만)
    screenshot: 'only-on-failure',
  },

  // 브라우저별 프로젝트 설정
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // E2E 전에 개발 서버 자동 시작 (CI 환경용)
  // 로컬에서는 미리 `bun dev`를 실행해두어야 한다
  webServer: process.env.CI
    ? {
        command: 'bun run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 120 * 1000,
      }
    : undefined,
});
