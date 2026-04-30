# 마스터 상품 구조 개편 기획서

**작성일**: 2026-04-30
**상태**: 기획 확정 (구현 대기)

---

## 1. 배경 및 목적

### 1.1 현재 구조의 문제점
현재 시스템은 **마스터 상품 → 채널로 push** 하는 모델이다.
- 사용자가 마스터 상품을 만들고 → 각 채널에 listing → `listed_products` 레코드 생성
- 모든 정보가 마스터에서 출발해서 채널로 흐른다고 가정

**문제:** 이미 채널(Qoo10/Shopee/Shopify 등)에 등록되어 운영 중인 상품이 수십~수백 개 있는 사용자가 우리 서비스에 들어왔을 때, 그 상품들을 다시 마스터로 만들어 push하는 건 비현실적이다.

### 1.2 새 구조의 방향
**채널 = 진실의 원천(Source of Truth) for 상품 존재 여부**
**마스터 = 진실의 원천(Source of Truth) for 상품 메타정보/재고 관리**

- 채널 상품 리스트는 채널 API에서 **실시간 fetch** (DB에 저장 X)
- 마스터 상품은 "관리/표시 단위"로 만들고, 사용자가 채널 상품에 **연결**
- 연결되면 마스터 정보가 채널 정보를 **덧씌워(overlay)** 표시
- 재고/판매 동기화는 연결된 상품 간에서만 동작

---

## 2. 핵심 결정사항 요약

| # | 항목 | 결정 |
|---|---|---|
| Q1 | 채널 상품 데이터 소스 | 페이지 열 때마다 채널 API 호출, **DB 저장 X** |
| Q2 | 신규 사용자 흐름 | 처음엔 판매상품(채널)만 보임. 마스터 등록 후 연결 가능 |
| Q3 | 정보 우선순위 | **마스터 정보가 채널 정보를 덧씌움(overlay)** |
| Q4 | 다중 옵션 처리 | 옵션마다 개별 매핑 (하나의 마스터 variant ↔ 하나의 채널 옵션) |
| Q5 | 기존 `listed_products` | **모두 삭제 (clean slate)** — 사용자가 새로 연결 |
| Q6 | Push 신규등록 | **제거** — link-only 모델. 마스터를 채널에 신규 등록하는 기능 X |
| Q7 | SellerCode 매핑 | 비어있으면 자동 채움. 채워져 있으면 충돌 목록 모달 + 선택 덮어쓰기 |
| Q8 | Pull-sales 범위 | 마스터 연결된 채널 상품만 가능 |
| Q9 | 재고 push 방향 | 마스터 재고 변경 시 연결된 채널에 **자동 push** |

---

## 3. 데이터 모델 변경

### 3.1 유지되는 테이블 (변경 없음)
- `users`
- `channels` — 채널 API key 연결 정보
- `master_products` — 마스터 상품 (상품 정보)
- `master_product_variants` — 마스터 옵션 (재고 보유 단위)
- `master_stock_ledger` — 재고 변동 기록
- `orders`, `order_items` — 주문/매출 기록 (참고용)

### 3.2 변경되는 테이블

#### `listed_products` — 의미 재정의
**기존**: 마스터로부터 push된 채널 상품 레코드 (모든 채널 상품 정보 보관)

**변경 후**: **연결(link) 정보만** 저장하는 매핑 테이블
- 마스터 ↔ 채널 상품 간 연결 상태 추적
- 채널 상품 본체 정보(제목/가격/이미지 등)는 **저장하지 않음** — 항상 채널 API에서 fetch

```typescript
// 변경 후 listed_products (개념)
{
  id: uuid,
  userId: uuid,
  masterProductId: uuid,        // NOT NULL (연결됐을 때만 row 존재)
  channelId: uuid,
  channelItemId: varchar,       // 채널 고유 ID (Qoo10 ItemCode, Shopify gid, ...)
  linkedAt: timestamp,
  channelData: jsonb,           // _lastSalesPullAt, _salesPullBaselineAt, _processedOrderIds 등
}
```

**필드 정리:**
- `title`, `descriptionHtml`, `price`, `images`, `tags`, `attributes` 등 **상품 본체 정보 컬럼 제거**
- `syncStatus`, `lastSyncedAt` 제거 (push 모델 흔적)
- `masterProductId`를 NOT NULL로 변경 (연결 안 된 상태는 row 자체가 없음)

#### 신규 테이블: `listed_product_variant_links`
마스터 variant ↔ 채널 옵션 매핑
```typescript
{
  id: uuid,
  listedProductId: uuid,           // FK → listed_products
  masterVariantId: uuid,           // FK → master_product_variants
  channelVariantId: varchar,       // 채널 옵션 고유 ID (Qoo10 OptionCode, Shopify variant gid)
  channelSellerCode: varchar,      // 매핑 당시의 SellerCode (참고/표시용)
  createdAt: timestamp,
}
```

**왜 필요한가?**
- 옵션 여러 개 매칭은 마스터 variant ↔ 채널 옵션 간 **N:M 가능성** 있음 (다른 마스터에 같은 채널 옵션 연결 막아야 하니 unique 제약)
- 판매 동기화 시 "어느 채널 옵션이 팔렸을 때 어느 마스터 variant 재고를 깎을지" 룩업

**제약:**
- `(listedProductId, masterVariantId)` UNIQUE
- `(listedProductId, channelVariantId)` UNIQUE

### 3.3 마이그레이션 전략 (Q5: clean slate)
1. 기존 `listed_products` 모든 row **DELETE**
2. 컬럼 변경 (불필요 컬럼 제거, `masterProductId` NOT NULL 전환)
3. `listed_product_variant_links` 테이블 생성
4. `master_stock_ledger`는 그대로 유지

**Drizzle 마이그레이션 파일:**
- `0006_drop_listed_product_columns.sql` (delete + alter)
- `0007_create_variant_links.sql` (new table)

---

## 4. API 설계

### 4.1 채널 상품 실시간 조회
모든 채널 어댑터에 공통 메서드 추가:
```typescript
// ChannelAdapter interface
listProducts(params: ListProductsParams): Promise<ChannelProduct[]>
```

**응답 정규화 형식 (`ChannelProduct`):**
```typescript
interface ChannelProduct {
  channelItemId: string;        // 채널 고유 ID (Qoo10 ItemCode 등)
  sellerCode?: string;          // 채널 SKU (있으면)
  title: string;
  price?: string;
  images: string[];
  variants: ChannelProductVariant[];
  raw?: unknown;                // 채널별 원본 (필요시)
}

interface ChannelProductVariant {
  channelVariantId: string;     // 채널 옵션 고유 ID
  optionCode?: string;          // 옵션별 SellerCode (Qoo10 OptionCode 등)
  optionName?: string;          // 예: "색상/사이즈"
  optionValue?: string;         // 예: "검정/260"
  price?: string;
  stock?: number;
}
```

### 4.2 신규 엔드포인트

#### `GET /api/channels/:channelId/products`
- 채널 API에서 **실시간** 상품 리스트 fetch
- 동시에 우리 DB의 `listed_products`를 join해서 **연결 상태** 포함
- 페이지네이션은 채널 API 페이지네이션 따름

**응답:**
```typescript
{
  products: Array<{
    channelItemId: string,
    sellerCode?: string,
    title: string,
    price?: string,
    images: string[],
    variants: ChannelProductVariant[],
    
    // 연결 상태 (우리 DB에서)
    link: null | {
      listedProductId: string,
      masterProductId: string,
      masterTitle: string,        // 덧씌워질 정보 미리보기
      linkedVariantCount: number,
      totalVariantCount: number,
    }
  }>,
  pagination: { ... }
}
```

#### `POST /api/channels/:channelId/products/:channelItemId/link`
**채널 상품 ↔ 마스터 상품 연결**

**Request:**
```typescript
{
  masterProductId: string,
  variantMappings: Array<{
    masterVariantId: string,
    channelVariantId: string,
    overrideSellerCode: boolean,   // SellerCode 덮어쓰기 동의 여부
  }>,
}
```

**서버 처리:**
1. 채널 API에서 해당 상품 다시 fetch (최신 상태 확인)
2. `listed_products` row 생성 (`masterProductId` 연결)
3. `listed_product_variant_links` row 생성 (각 variant 매핑)
4. `overrideSellerCode === true`인 항목들에 대해 채널 API로 SellerCode 업데이트 호출
5. 마스터 재고를 채널에 즉시 push (Q9 정책 — 자동 push)

**응답:**
```typescript
{
  listedProductId: string,
  linkedVariantCount: number,
  sellerCodeUpdates: Array<{ channelVariantId: string, oldCode: string, newCode: string, status: 'OK' | 'FAILED', error?: string }>,
  stockPushStatus: 'OK' | 'PARTIAL' | 'FAILED',
}
```

#### `POST /api/listed-products/:id/unlink`
연결 해제. row 삭제 + 변동 기록만 남김.

#### `POST /api/listed-products/:id/pull-sales`
**기존 엔드포인트 유지** — 다만:
- 연결된 상품에서만 작동 (Q8)
- 옵션별 재고 차감 시 `listed_product_variant_links`로 channelVariantId → masterVariantId 룩업

#### 제거되는 엔드포인트
- `POST /api/master-products/:id/list` (Q6: push 신규등록 제거)
- `POST /api/listed-products/:id/sync` (재고 push는 마스터 변경 시 자동 → 별도 트리거 불필요)
- `POST /api/listed-products/:id/check-channel` (대조 기능 자체 보류, 새 모델에선 항상 fetch가 진실이라 의미 약함)

### 4.3 마스터 재고 변경 시 자동 push (Q9)
`MasterProductService.updateVariant()` / 재고 ledger 기록 직후:
1. 해당 `masterVariantId`로 연결된 모든 `listed_product_variant_links` 조회
2. 각 채널에 stock update API 호출 (병렬, best-effort)
3. 실패해도 마스터 변경은 롤백하지 않음 (재시도 큐에 넣거나 알림)

---

## 5. UI 흐름

### 5.1 판매 상품 페이지 (`/sales-products` 또는 `/channels/:id/products`)
```
┌─────────────────────────────────────────────────────────────┐
│ Qoo10 판매 상품  (실시간)                  [채널 선택 ▼]    │
├─────────────────────────────────────────────────────────────┤
│ [이미지] Nike Sneakers                                       │
│         ItemCode: Q5678901                                   │
│         SellerCode: NIKE-BLACK-260                           │
│         옵션 3개                                             │
│         ⚠ 연결된 마스터 상품 없음     [마스터 상품 연결 ▶]   │
├─────────────────────────────────────────────────────────────┤
│ [이미지] Adidas Hoodie                                       │
│         ItemCode: Q9999111                                   │
│         SellerCode: (없음)                                   │
│         옵션 1개                                             │
│         ✓ 연결됨: "아디다스 후드" (옵션 1/1)                 │
│         [연결 해제] [판매 동기화] [마스터 보기]              │
└─────────────────────────────────────────────────────────────┘
```

**상태별 표시:**
- **미연결**: ⚠ 노란 배지 "연결된 마스터 상품 없음" + [마스터 상품 연결] 버튼
- **연결됨 (전체 옵션 매핑 완료)**: ✓ 초록 배지 "연결됨"
- **연결됨 (일부 옵션만 매핑)**: ⚠ 주황 배지 "부분 연결 (1/3)" — 누락 옵션 추가 매핑 가능

### 5.2 마스터 상품 연결 모달

#### 단계 1: 마스터 상품 선택
```
┌─────────────────────────────────────────────────────────────┐
│ 마스터 상품 연결                                       [×]   │
├─────────────────────────────────────────────────────────────┤
│ 채널 상품: Nike Sneakers (Q5678901)                          │
│                                                              │
│ 연결할 마스터 상품을 선택하세요:                              │
│ ┌─────────────────────────────────────────┐                 │
│ │ 🔍 검색...                              │                 │
│ └─────────────────────────────────────────┘                 │
│ ○ 나이키 운동화 (NIKE-001) - 옵션 3개                        │
│ ○ 나이키 검정 (NIKE-002) - 옵션 1개                          │
│                                                              │
│                            [취소]  [다음 →]                  │
└─────────────────────────────────────────────────────────────┘
```

#### 단계 2: 옵션 매핑 (자동 시도 + 수동 보완)
```
┌─────────────────────────────────────────────────────────────┐
│ 옵션 매핑                                              [×]   │
├─────────────────────────────────────────────────────────────┤
│ 마스터 옵션을 채널 옵션에 매칭하세요.                         │
│ SKU가 같으면 자동으로 매칭됩니다.                             │
│                                                              │
│ 마스터 옵션              채널 옵션 (Qoo10)                   │
│ ────────────────────────────────────────────                │
│ ✓ NIKE-BLACK-260   →   [NIKE-BLACK-260 ▼]  (자동)           │
│   검정/260mm            (Q5678901-A)                         │
│                                                              │
│ ✓ NIKE-BLACK-270   →   [NIKE-BLACK-270 ▼]  (자동)           │
│   검정/270mm            (Q5678901-B)                         │
│                                                              │
│ ⚠ NIKE-WHITE-260   →   [선택하세요... ▼]   (수동 필요)       │
│   흰색/260mm                                                 │
│                                                              │
│ 사용 가능한 채널 옵션:                                       │
│ - NK-W-260 (Q5678901-C, 흰색/260)                           │
│                                                              │
│                       [← 이전]  [다음 →]                     │
└─────────────────────────────────────────────────────────────┘
```

#### 단계 3: SellerCode 충돌 확인 모달 (Q7-c)
**충돌(채널에 SellerCode 이미 있음)이 있을 때만 표시.** 비어있는 옵션은 묻지 않고 자동 채움.

```
┌─────────────────────────────────────────────────────────────┐
│ SellerCode 덮어쓰기 확인                               [×]   │
├─────────────────────────────────────────────────────────────┤
│ 다음 채널 옵션에 이미 SellerCode가 설정되어 있습니다.         │
│ 마스터 SKU로 덮어쓸 항목을 선택하세요.                        │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ ☑ │ 마스터 SKU       │ 채널 현재 SellerCode  │ 덮어쓰기 │   │
│ ├──────────────────────────────────────────────────────┤    │
│ │ ☑ │ NIKE-BLACK-260   │ OLD-CODE-001         │ ✓       │    │
│ │ ☐ │ NIKE-BLACK-270   │ OLD-CODE-002         │ —       │    │
│ │ ☑ │ NIKE-WHITE-260   │ OLD-WHITE            │ ✓       │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ [모두 선택] [모두 해제]                                      │
│                                                              │
│ ⓘ 비어있는 SellerCode는 자동으로 마스터 SKU로 채워집니다.    │
│                                                              │
│                  [← 이전]  [연결 완료]                       │
└─────────────────────────────────────────────────────────────┘
```

#### 단계 4: 결과
```
┌─────────────────────────────────────────────────────────────┐
│ ✓ 연결 완료                                                  │
├─────────────────────────────────────────────────────────────┤
│ "Nike Sneakers" ↔ "나이키 운동화" 연결됨                     │
│                                                              │
│ • 옵션 3개 매핑 완료                                          │
│ • SellerCode 업데이트: 2건 성공, 0건 실패                    │
│ • 재고 동기화: 채널에 push 완료                              │
│                                                              │
│                                       [확인]                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 마스터 상품 페이지에서의 변화
- "채널에 등록(list to channel)" 버튼 **제거** (Q6)
- 대신 "연결된 채널 상품" 섹션에서 어느 채널의 어느 상품에 연결되어 있는지만 표시
- 연결 추가는 항상 **판매 상품 페이지에서 시작** (채널 → 마스터 방향)

---

## 6. 정보 덧씌우기(Overlay) 규칙

연결된 상태에서 어디에 어떤 정보가 표시되는지:

| 화면 | 제목/설명/이미지 | 가격 | 재고 | 옵션 구조 |
|---|---|---|---|---|
| **판매 상품 페이지** | 마스터 우선, 없으면 채널 | 채널 | 마스터 | 채널 |
| **마스터 상품 페이지** | 마스터 | 마스터 | 마스터 | 마스터 |
| **주문 페이지** | 채널 (주문 시점 정보) | 채널 | — | 채널 |

**원칙:**
- "관리/표시" 영역(상품 정보, 이미지, 설명) → **마스터 우선**
- "운영" 영역(가격, 옵션 가격) → **채널이 진실** (채널이 결제/노출의 책임자)
- 재고 → **마스터가 진실** (마스터에서 채널로 push)

---

## 7. 비즈니스 로직 변경

### 7.1 Pull-sales (판매 동기화)
**변경점:**
- 입력: `listedProductId` (현재와 동일)
- 단계 1: `listed_product_variant_links`로 이 상품의 마스터 variant 룩업 (없으면 NO_VARIANTS)
- 단계 2: 채널 API에서 주문 fetch (`_salesPullBaselineAt` 이후 + 미처리 ID 제외)
- 단계 3: 주문 item의 `channelVariantId` (또는 SKU) → 매핑 테이블로 `masterVariantId` 변환
- 단계 4: 마스터 재고 차감 + ledger 기록 (refType=ORDER)
- 단계 5: `_processedOrderIds`, `_lastSalesPullAt` 업데이트

**SKU 매칭이 안 되는 경우:**
- 매핑이 없으면 그 주문 item은 skip + 결과에 포함 (`unmatchedItems`)
- 사용자가 매핑 추가 후 다시 동기화 가능

### 7.2 마스터 재고 변경 → 채널 자동 push
`MasterProductService.updateVariantStock()` 또는 `addStockLedgerEntry()` 호출 후:
1. 해당 variant의 `listed_product_variant_links` 모두 조회
2. 각 channelId별로 그룹핑
3. 채널 어댑터의 `updateVariantStock(channelVariantId, newStock)` 호출
4. 결과를 `master_stock_ledger.note`에 기록 (성공/실패 채널)

**실패 처리:**
- 마스터 변경은 그대로 (롤백 X)
- 실패한 채널은 별도 알림/큐에 추가 (추후 구현)

### 7.3 SellerCode 자동 채움 (Q7)
연결 시 `overrideSellerCode === true`인 항목 처리:
1. 채널의 현재 SellerCode 다시 fetch (race condition 방지)
2. 비어있으면: 무조건 채움
3. 채워져 있으면 (사용자가 모달에서 체크 후 제출): 덮어씀
4. 채워져 있고 사용자가 체크 안 함: 그대로 두고 매핑만 저장 (DB 매핑은 channelVariantId 기준이라 무관)

---

## 8. 채널별 어댑터 구현 작업

각 어댑터에 추가/수정 필요한 메서드:

| 메서드 | Qoo10 | Shopee | Shopify | Rakuten |
|---|---|---|---|---|
| `listProducts()` | ✅ 신규 | ✅ 신규 | ✅ 신규 | ✅ 신규 |
| `getProduct(itemId)` | ✅ 신규 | ✅ 신규 | ✅ 신규 | ✅ 신규 |
| `updateSellerCode(variantId, code)` | ✅ 신규 | ✅ 신규 | ✅ 신규 | ✅ 신규 |
| `updateVariantStock(variantId, qty)` | 기존 활용 | 기존 활용 | 기존 활용 | 기존 활용 |
| `getOrders()` | 기존 그대로 | 기존 그대로 | 기존 그대로 | 기존 그대로 |

**우선순위:** Qoo10 → Shopify → Shopee → Rakuten (사용 빈도 순)

---

## 9. 마이그레이션 단계

### Phase 1: 데이터 모델 (백엔드 only)
1. `listed_products` 데이터 전체 삭제 (Q5)
2. 마이그레이션 파일 생성 (컬럼 정리)
3. `listed_product_variant_links` 테이블 생성
4. Drizzle schema 업데이트

### Phase 2: 어댑터 메서드 추가
1. `listProducts` / `getProduct` / `updateSellerCode` 정규화 인터페이스 정의
2. Qoo10 어댑터 구현 → 나머지 채널 순차 진행

### Phase 3: API 엔드포인트
1. `GET /api/channels/:id/products` (실시간 fetch + 연결상태 join)
2. `POST /api/channels/:id/products/:itemId/link`
3. `POST /api/listed-products/:id/unlink`
4. 기존 pull-sales 엔드포인트는 매핑 테이블 활용으로 수정
5. 제거 대상 엔드포인트 정리 (`/list`, `/sync`, `/check-channel`)

### Phase 4: UI
1. 판매 상품 페이지 (`/sales-products`) 신규 생성
2. 마스터 상품 연결 모달 (4단계)
3. 마스터 상품 페이지에서 list 버튼 제거, 연결된 채널 상품 표시 섹션 추가

### Phase 5: 자동 재고 push
1. `MasterProductService` 재고 변경 hook
2. 채널별 best-effort push + 결과 ledger 기록

---

## 10. 미해결/추후 결정 항목

추후 결정 필요 (지금 구현엔 영향 없음):
- 자동 push 실패 시 재시도/알림 정책
- "부분 연결" 상태 (옵션 일부만 매핑) UI에서 어떻게 강조할지
- 마스터 삭제 시 연결된 channel listing은 어떻게 할지 (현재는 listed_products row만 삭제)
- 가격 동기화: 현재 안 함. 나중에 가격도 마스터에서 push 할지 결정 필요

---

## 11. 영향받는 파일 (구현 시 참고)

### 백엔드
- `apps/server/src/db/schema.ts` (listed_products 컬럼 정리, variant_links 추가)
- `apps/server/drizzle/0006_*.sql`, `0007_*.sql` (신규 마이그레이션)
- `apps/server/src/services/MasterProductService.ts` (link/unlink/pull-sales 로직 수정)
- `apps/server/src/services/ChannelService.ts` 또는 신규 `ChannelProductService.ts`
- `apps/server/src/adapters/{qoo10,shopee,shopify,rakuten}/*Adapter.ts`
- `apps/server/src/routes/*.ts` (엔드포인트 추가/제거)

### 프론트엔드
- `apps/web/src/entities/master-product/api/masterProductMutations.ts` (link/unlink mutation, 기존 list/sync/check 제거)
- `apps/web/src/entities/channel-product/` (신규 entity)
- `apps/web/src/features/link-master-to-channel/` (신규 feature - 4단계 모달)
- `apps/web/src/app/sales-products/page.tsx` (신규 페이지)
- `apps/web/src/app/master-products/[id]/page.tsx` (list 버튼 제거)

---

**기획 확정. 구현은 Phase 1부터 순차 진행 권장.**
