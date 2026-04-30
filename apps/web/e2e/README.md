# E2E 테스트 가이드

## 사전 준비

### 1. Playwright 설치

```bash
cd apps/web
bun install          # @playwright/test 패키지 설치
npx playwright install  # 브라우저 바이너리 설치
```

### 2. 개발 서버 실행

```bash
# 루트에서
bun dev:web
```

### 3. 환경변수 설정 (선택)

```bash
# apps/web/.env.e2e.local
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=test1234!
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## 실행 방법

```bash
# 기본 실행 (헤드리스)
bun run test:e2e

# 특정 파일만
bun run test:e2e e2e/login.spec.ts

# UI 모드 (인터랙티브)
bun run test:e2e:ui

# 리포트 보기
npx playwright show-report
```

## 테스트 파일 구조

```
e2e/
├── README.md                  # 이 파일
├── auth.setup.ts              # 인증 상태 저장 (로그인 Setup)
├── login.spec.ts              # 로그인 페이지 E2E
├── orders.spec.ts             # 주문 관리 페이지 E2E
└── settings-channels.spec.ts  # 채널 설정 페이지 E2E
```

## 주의사항

- E2E 테스트는 실제 서버와 통신하지 않는 단위 테스트(`vitest`)와 달리,
  실행 중인 앱을 대상으로 브라우저 레벨에서 동작을 검증한다.
- CI 환경에서는 `playwright.config.ts`의 `webServer` 설정으로
  자동으로 개발 서버가 시작된다.
- 실제 채널 API 테스트는 별도의 테스트 계정과 API 키가 필요하다.
  민감 정보는 절대 코드에 하드코딩하지 않는다.
