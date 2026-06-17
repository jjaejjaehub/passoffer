# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 개발 서버 (monorepo 전체)
bun run dev

# 개별 앱
bun run dev:web       # Next.js (port 3000)
bun run dev:server    # Fastify (port 4000)

# 빌드 / 타입체크
bun run build
bun run typecheck

# 린트 / 포맷 (Biome)
bun run lint
bun run format

# 테스트 (web)
cd apps/web && bun run test           # vitest 단발
cd apps/web && bun run test:watch     # vitest 워치
cd apps/web && bun run test:e2e       # Playwright

# DB
cd apps/server && bun run db:generate   # 마이그레이션 파일 생성
cd apps/server && bun run db:migrate    # 마이그레이션 실행
cd apps/server && bun run db:seed       # 시드 데이터
cd apps/server && bun run db:studio     # Drizzle Studio
```

## 아키텍처

### 모노레포 구조

```
apps/
├── web/     @oms/web    — Next.js 16 App Router 프론트엔드
└── server/  @oms/server — Fastify 5 백엔드
packages/
└── types/   @oms/types  — 서버·클라이언트 공유 타입
```

### 프론트엔드 — FSD (Feature-Sliced Design)

```
src/
├── app/       — Next.js App Router 라우트 파일 (re-export만, 실 로직 없음)
├── pages/     — 라우트별 페이지 컴포넌트 (진입점)
├── widgets/   — 복합 UI 블록 (테이블, 패널 등)
├── features/  — 단일 기능 단위 비즈니스 로직
├── entities/  — 도메인 엔티티 + TanStack Query 훅
└── shared/    — HTTP 클라이언트, config, 공통 UI, 유틸
```

**의존 방향은 단방향:** `app → pages → widgets → features → entities → shared`
상위 레이어가 하위 레이어를 import 해야 하며 역방향 금지.

### 백엔드 — Fastify 플러그인 체계

```
src/
├── plugins/   — env · db · cors · jwt (등록 순서 고정)
├── routes/    — 도메인별 라우트 핸들러
├── services/  — ChannelService · MasterProductService · StockService · WarehouseService
├── adapters/  — 채널별 IChannelAdapter 구현체 (Qoo10 · Shopify · Shopee · Rakuten)
│              — WMS 어댑터 (MockCJLogistics · MockSFTPBatch · MockSelfWarehouse)
└── db/        — Drizzle ORM 스키마 + 마이그레이션
```

## 핵심 도메인 모델

**마스터 상품 → 리스팅 상품 → 채널 상품** 3계층 구조:
- `master_products` — 채널 독립적인 상품 원본 (variants 포함)
- `listed_products` — 마스터 ↔ 채널 연결 레코드 (variant 매핑 포함)
- 채널 상품 — Qoo10·Shopify 등 각 채널에 실제 등록된 상품

재고는 마스터 variant 단위로 관리되며, 채널별 리스팅에 stock push로 동기화됨.

## 채널 연동

- 채널 자격증명은 AES-256-GCM으로 암호화 후 DB 저장 (`ChannelService.encrypt/decrypt`)
- 각 채널은 `IChannelAdapter` 인터페이스를 구현 (`@oms/types`)
- **Qoo10 API 호스트는 반드시 `api.qoo10.jp`** (www.qoo10.jp는 404)
- 채널별 플랫폼 필드 스펙은 `apps/web/src/shared/config/platformFields.ts`의 `PLATFORM_DEFS`로 관리
  - `key`: `QOO10_JP` | `SHOPIFY` | `SHOPEE` | `RAKUTEN`
  - `channelId`: `qoo10` | `shopify` | `shopee` | `rakuten`
  - `requiredCommonFields`의 `descriptionHtml`은 플랫폼별 설명(예: `qoo10.ItemDescription`)이 채워진 경우 충족된 것으로 간주

### 채널 API 문서 조회 규칙 (중요)

채널 API 작업 시 **무조건 아래 인덱스를 먼저 읽고** 필요한 엔드포인트 .md만 추가 로드.
전체 디렉토리/여러 엔드포인트 .md를 한 번에 읽지 말 것 — 컨텍스트 폭주.

| 채널 | 인덱스 | 비고 |
|---|---|---|
| Qoo10 | `docs/api/qoo10/INDEX.md` | 공통 규칙은 `docs/api/qoo10/common/conventions.md` |
| Shopify | (MCP 사용) | `mcp__shopify-dev-mcp__search_docs_chunks` 우선 |
| Shopee | _미작성_ | OpenAPI spec 기반 예정 |
| Rakuten | _미작성_ | |

작업 중 발견한 함정/예외는 해당 엔드포인트 .md의 "작업 시 주의사항" 섹션에 누적.
공통 규칙은 `common/conventions.md`에 추가.

## HTTP 클라이언트

프론트엔드에서 모든 API 호출은 `shared/api`의 `http` 헬퍼 사용:

```ts
import { http } from "@/shared/api";
http.get<T>("/api/...")
http.post<T>("/api/...", body)
```

- JWT 토큰은 `localStorage('oms-auth-token')`에서 자동으로 Authorization 헤더에 주입
- 401 응답 시 토큰 제거 후 `/login`으로 리다이렉트 (로그인 엔드포인트 제외)
- 백엔드 URL: `NEXT_PUBLIC_API_URL` 환경변수

## 플랫폼 필드 readiness 체크

`checkPlatformReadiness(def, commonValues, platformValues)` 패턴:
- `commonValues`: `{ title, descriptionHtml, images, ... }` (공통 필드)
- `platformValues`: `{ "qoo10.ItemDescription": "..." }` (네임스페이스 포함 키)
- `descriptionHtml` 누락 시, 해당 플랫폼 전용 설명 필드가 채워져 있으면 통과 처리
