# my-oms 프로젝트 초기 설명서 (for Claude)

아래 내용을 Claude에게 그대로 전달하면, 현재 프로젝트 상태를 빠르게 이해하고 일관된 방식으로 작업할 수 있습니다.

---

## 1) 프로젝트 한 줄 요약

`my-oms`는 **Qoo10 중심 OMS(Order Management System)** 프론트엔드로,  
현재는 **대시보드/주문/상품 조회/상품 등록/상품 수정/채널(API 키) 관리** 기능을 Next.js App Router + FSD 구조로 개발 중입니다.

---

## 2) 기술 스택

- Next.js App Router (`next@16`)
- React 19 + TypeScript(strict)
- Chakra UI v3
- TanStack Query v5
- React Hook Form + Zod
- Axios (공통 `http` 래퍼 사용)
- date-fns, lucide-react, framer-motion
- Biome (`lint`, `format`)

---

## 3) 아키텍처/코딩 규칙 (매우 중요)

### 폴더/레이어

- 라우팅 전용: `app/`
- 실제 구현: `src/` (FSD)
- 의존 방향:
  - `app -> pages -> widgets -> features -> entities -> shared`

### App Router 작성 원칙

- `app/**/page.tsx`, `app/layout.tsx`는 **직접 구현하지 않고 re-export만** 한다.
- 비즈니스 로직/실제 JSX는 `src/pages/**`에 둔다.

### Server/Client 경계

- 기본은 Server Component.
- `useState/useEffect`, 이벤트 핸들러, 브라우저 API, TanStack Query, RHF, Chakra 사용 파일은 `'use client'`.

### 타입 안정성

- `any` 지양, 가능한 `unknown` + 타입 가드.
- API 응답은 제네릭 타입 명시.
- 함수/훅 반환 타입 명시.

---

## 4) 현재 주요 라우트

- `/dashboard` : Qoo10 월간 매출/주문/클레임 현황
- `/orders` : 주문 조회/필터/선택/상세 드로어
- `/products` : 상품 목록 조회(상태별/검색/페이지네이션), 상세 모달
- `/products/new` : 상품 등록 폼
- `/items/[itemCode]/edit` : 상품 수정 폼
- `/settings/channels` : 채널 연결/API 키 관리

레이아웃은 `src/pages/root/ui/RootLayout.tsx`에서  
`Providers(Query + Chakra) + AppShell(사이드바)` 구조로 감싼다.

---

## 5) API 구조 (핵심)

클라이언트는 주로 내부 API(`/api/qoo10/*`)를 호출하고,  
해당 API 라우트가 Qoo10 외부 API를 프록시/정규화한다.

주요 엔드포인트:

- `POST /api/qoo10/shipping` : 주문/배송 조회
- `POST /api/qoo10/claim` : 클레임 조회
- `POST /api/qoo10/products` : 상품 목록 조회 + 상품 등록(SetNewGoods)
- `GET /api/qoo10/items/[itemCode]` : 상품 상세
- `POST /api/qoo10/items/update` : 상품 수정
- `POST /api/qoo10/items/[itemCode]/inventory` : 옵션/재고 조회
- `GET /api/qoo10/categories` : 카테고리
- `GET /api/qoo10/brands` : 브랜드

---

## 6) 데이터/상태 관리 포인트

- Qoo10 API 키는 채널별 로컬 저장소를 통해 관리 (`entities/channel`).
- Query는 TanStack Query로 관리, 기본 retry 정책 적용.
- 주문/상품/대시보드는 API 키 유무에 따라 empty state를 우선 분기.
- 오류 타입을 사용자 메시지로 변환하는 로직이 일부 구현됨(특히 주문 조회).

---

## 7) 환경 변수

현재 코드상 사용되는 변수:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_USE_QOO10_MOCK_CLAIMS` (대시보드 클레임 mock 제어)

---

## 8) 현재 진행 상태(실무 관점)

- 기본 화면 골격 + 핵심 플로우는 이미 연결됨.
- Qoo10 연동은 주문/상품/상세/수정/등록까지 넓게 붙어 있음.
- 일부 기능은 아직 임시/개선 필요:
  - 콘솔 디버그 로그 다수
  - 에러 처리/메시지 표준화 여지
  - 일부 화면의 컴포넌트 분리/중복 제거 필요
  - 라쿠텐 등은 UI 위주 준비 단계

---

## 9) Claude 작업 지침 (붙여넣기용 프롬프트)

아래를 Claude에게 "작업 시작 프롬프트"로 전달:

```text
너는 my-oms 프로젝트의 시니어 프론트엔드 엔지니어다.

[프로젝트 맥락]
- Next.js App Router + TypeScript(strict) + Chakra UI + TanStack Query + RHF + Zod
- FSD 구조를 사용하고 의존 방향은 app -> pages -> widgets -> features -> entities -> shared
- app 폴더는 라우팅 re-export 전용, 실제 구현은 src 쪽에서만 작업
- 서버/클라이언트 컴포넌트 경계를 엄격히 지켜라
- any/as 남용 금지, API 타입 명시, 에러 처리 명시적으로 구현

[현재 기능]
- /dashboard, /orders, /products, /products/new, /items/[itemCode]/edit, /settings/channels
- 내부 API 라우트 /api/qoo10/* 로 Qoo10 연동

[작업 방식]
1) 먼저 관련 파일을 읽고 현재 구조를 요약해라.
2) 변경 범위를 최소화해서 구현해라.
3) 기존 아키텍처/FSD 규칙을 절대 깨지 마라.
4) 에러/로딩/빈 상태를 반드시 포함해라.
5) 타입 안정성을 최우선으로 하고, 필요한 경우 타입 가드를 작성해라.
6) 변경 후 영향 범위와 검증 방법(수동 테스트 시나리오)을 제시해라.

[응답 형식]
- "변경 이유 -> 변경 파일 -> 핵심 코드 포인트 -> 테스트 방법 -> 남은 리스크" 순서로 간결하게 답변해라.
```

---

## 10) Claude에게 추가로 같이 주면 좋은 정보

- 현재 하고 싶은 작업 목표 1문장
- 실패한 시도/에러 로그
- 변경 허용 범위(예: `src/entities/product`만 수정 가능)
- 완료 기준(예: "상품 수정 저장 성공 + 에러 토스트 표시")

