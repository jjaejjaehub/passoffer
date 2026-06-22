# SKU ↔ Master ↔ Sales 재구조 설계

> 브랜치: `feat/sku-master-listed-restructure`
> 작성: 2026-06-01

## 1. 배경 & 목표

기존 모델은 마스터 상품이 자체적으로 variant(=SKU + 옵션조합 + 재고)를 보유하고, 채널 판매상품은 마스터 variant에 1:1로 연결되는 구조였다.

문제:
- **동일 SKU가 여러 마스터 상품(세트/번들/리뉴얼 코드)에 동시에 속하는 케이스를 표현할 수 없다.**
- 재고가 마스터 variant 단위로 묶여 있어, "같은 실물 재고를 여러 SKU 코드로 채널에 노출"하는 운영을 표현하지 못한다.
- 마스터 상품 변경(코드 분리/통합) 시 재고가 끊긴다.

목표:
1. **재고의 1차 단위를 SKU로 옮긴다.** 마스터 variant는 더 이상 stock을 보유하지 않는다.
2. **SKU ↔ MasterProduct N:M** — 한 SKU가 여러 마스터에 들어갈 수 있고, 한 마스터 variant 자리가 여러 SKU(번들)로 채워질 수 있다.
3. **판매상품(ListedProduct)의 채널 variant ↔ SKU 직접 매핑.** 마스터 variant 경유를 없앤다.

## 2. 도메인 모델 (목표)

```
┌───────────┐    N:M    ┌─────────────────────┐    1:N    ┌──────────────────┐
│   SKU     │◀────────▶│   MasterProduct     │──────────▶│  ListedProduct   │
│ (재고원천)│           │  (채널 공통 정보)   │           │ (채널 등록 인스턴스)│
└─────┬─────┘           └──────────┬──────────┘           └────────┬─────────┘
      │                            │                                │
      │  ┌─────────────────────────▼──────────────┐                 │
      │  │ MasterProductVariant                   │                 │
      │  │ (옵션 조합만 표현, 재고/가격 없음)     │                 │
      │  └─────────────────────┬──────────────────┘                 │
      │                        │                                    │
      │   N:M (qty_per_variant)│                                    │
      └─────────────┬──────────┘                                    │
                    │                                               │
                    ▼                                               │
        ┌───────────────────────────┐         N:M (qty_per_channel)│
        │ master_variant_skus       │◀────────────────────────────┘
        │ (BOM: variant당 SKU+수량) │
        └───────────────────────────┘
```

요약:
- **SKU**: 재고가 붙는 유일한 실체. `code`, `name`, `stock`, `barcode?`.
- **MasterProductVariant**: 옵션 조합(색/사이즈)만 표현. price는 남기되 stock은 제거.
- **listed_product_skus**: ListedProduct의 채널 variant 1개를 → SKU N개로 풀어주는 BOM. push 시 `min(floor(sku.stock / qty))` 합산.

## 3. 신규/변경 테이블

### 3.1 신규: `skus`
```ts
{
  id: uuid PK,
  userId: uuid FK users,
  code: varchar(128) NOT NULL,        // 사용자 정의 SKU 코드
  name: varchar(255),
  stock: integer NOT NULL DEFAULT 0,  // 재고는 여기로
  barcode: varchar(64),
  attributes: jsonb DEFAULT '{}',
  createdAt, updatedAt,
  unique(userId, code)
}
```

### 3.2 신규: `master_variant_skus` (마스터 variant ↔ SKU BOM)
```ts
{
  id: uuid PK,
  masterVariantId: uuid FK master_product_variants ON DELETE CASCADE,
  skuId: uuid FK skus ON DELETE RESTRICT,
  qty: integer NOT NULL DEFAULT 1,    // 이 variant 1개당 필요한 SKU 수
  position: integer NOT NULL DEFAULT 0,
  createdAt,
  unique(masterVariantId, skuId)
}
```
※ 단일 SKU 케이스는 `qty=1` 한 행만 들어간다. 번들/세트는 여러 행.

### 3.3 신규: `listed_product_skus` (채널 variant ↔ SKU)
```ts
{
  id: uuid PK,
  listedProductId: uuid FK listed_products ON DELETE CASCADE,
  channelVariantId: varchar(256) NOT NULL,  // 채널 옵션 ID
  channelSellerCode: varchar(256),
  skuId: uuid FK skus ON DELETE RESTRICT,
  qty: integer NOT NULL DEFAULT 1,
  createdAt,
  unique(listedProductId, channelVariantId, skuId)
}
```
※ 기존 `listed_product_variant_links` 대체. masterVariant 참조는 사라진다 — 채널 ↔ SKU 직결.

### 3.4 변경: `master_product_variants`
- `stock` 컬럼 **제거** (재고는 SKU로 이동)
- `sku` 컬럼 **제거** (master_variant_skus로 정규화)
- `price` 유지

### 3.5 변경: `master_stock_ledger`
- `variant_id` → `sku_id` 로 컬럼 변경
- 나머지 필드(qty_delta, prev/new_stock, refType, refId, channelId, listedProductId)는 유지
- `listed_product_variant_links` 참조도 제거

### 3.6 deprecate: `listed_product_variant_links`
- 백필 후 drop. 운영 데이터 검증을 위해 1단계에서는 view로 살려두는 것도 옵션.

## 4. 데이터 마이그레이션

기존 데이터:
- `master_product_variants.sku` (단일 텍스트) + `master_product_variants.stock`
- `listed_product_variant_links.masterVariantId ↔ channelVariantId`

전환 절차 (one-shot SQL + Bun 스크립트):
1. `skus` 테이블 생성.
2. 기존 모든 `master_product_variants` 행에 대해 — `(userId, sku텍스트)` 쌍이 유일한 SKU 단위로 `skus`에 1행 생성. `stock`은 그대로 옮긴다. (같은 텍스트가 여러 마스터에 있으면 stock은 **합산**할지 **첫 행 기준**으로 둘지 결정 필요 — 안전하게 **첫 행 기준 + 충돌은 로그**.)
3. `master_variant_skus`에 (variantId, skuId, qty=1) 백필.
4. `listed_product_variant_links` 각 행을 → `(listedProductId, channelVariantId, skuId, qty=1)`로 변환해 `listed_product_skus`에 적재.
5. `master_stock_ledger.variant_id` → `sku_id` 변환 (variant→SKU 매핑 통해).
6. 검증 쿼리: SKU별 stock 합 = 기존 variant stock 합, link 수 일치.
7. `master_product_variants.stock`, `master_product_variants.sku`, `listed_product_variant_links` 드롭.

drizzle-kit으로 한 번에 generate하면 `DROP COLUMN` + `DROP TABLE`이 데이터 손실로 이어지므로, **마이그레이션을 다단계로 쪼갠다**:
- `0005_skus_and_junctions.sql` — 신규 테이블 생성만
- `bun run db:backfill-skus` — 백필 + 검증
- `0006_drop_legacy_variant_fields.sql` — 컬럼/테이블 제거

## 5. 재고 동작

- **주문 차감**: 채널 주문 → ListedProduct → `listed_product_skus`에서 채널 variant에 매핑된 SKU들을 찾아 `sku.stock -= qty * orderQty` (트랜잭션, 원자적).
- **마스터 측 노출**: 마스터 variant 1개의 "가용 재고"는 `min over (master_variant_skus rows) of floor(sku.stock / qty)`. 폼/리스트에서 계산해서 표시만.
- **채널 push**: ListedProduct의 각 채널 variant에 대해 `min(floor(sku.stock / qty))` 합산값을 채널 API로 전송.
- **수동 조정**: 항상 SKU 단위에서만. 마스터 variant 화면에는 재고 입력 칸 없음.

## 6. API 변화

### 6.1 신규
- `GET /api/skus` — 목록(검색, 페이지네이션)
- `POST /api/skus`, `PATCH /api/skus/:id`, `DELETE /api/skus/:id`
- `POST /api/skus/:id/adjust-stock` — 수동 재고 조정 (refType=USER)

### 6.2 변경
- `POST /api/master-products` / `PATCH .../:id`
  - 기존: `variants: [{ sku, price, stock, options }]`
  - 변경: `variants: [{ price, options, skus: [{ skuId, qty }] }]`
- `POST /api/channels/:channelId/products/:itemId/link`
  - 기존: `variantMappings: [{ masterVariantId, channelVariantId }]`
  - 변경: `variantMappings: [{ channelVariantId, skus: [{ skuId, qty }] }]`
- `GET /api/master-products/:id`
  - response.variants[i]에 `skus`, `availableStock`(계산값) 포함
- `GET /api/listed-products/:id`
  - response에 `variantSkus: [{ channelVariantId, skus: [...] }]` 포함

## 7. 프론트엔드 변화

- **신규 `entities/sku`** — `useSkus`, `useSku`, mutation 훅
- **신규 페이지**: `/skus` (목록), `/skus/[id]` (상세/재고이력)
- **마스터 폼 (`MasterProductFormPage`)**:
  - 변형 행 안에 SKU 선택 칸 + 수량 (다중). 단일 SKU가 기본.
  - 재고 입력 칸 제거, "가용재고 계산값" 표시.
- **판매상품 매핑 (`CreateMasterFromChannelModal`, 링크 UI)**:
  - 채널 옵션 한 행마다 SKU 직접 선택 (마스터 variant 경유 제거)
- **위젯 `widgets/sku-picker`** — Combobox + 재고 표시

## 8. 단계적 진행 순서

1. 신규 테이블 추가 마이그레이션 (`0005`)
2. SkuService + 기본 API (`/api/skus`)
3. 백필 스크립트 작성 & 시드/스테이징에서 dry-run
4. MasterProductService를 SKU 참조로 리팩토링 (입출력 형식 변경)
5. ChannelService/어댑터 push 로직: `listed_product_skus` 기반으로
6. ListedProduct 매핑 엔드포인트 변경
7. 프론트엔드 SKU 페이지/위젯 → 마스터 폼 → 판매상품 매핑 순으로 전환
8. legacy column/table drop 마이그레이션 (`0006`)
9. 시드 재실행 + 수동 골든패스 검증

## 9. 미정/결정 필요

- 백필 시 같은 SKU 코드를 가진 여러 variant의 재고를 **합산할지 / 최댓값 / 첫 행** — 현재는 **첫 행 + 충돌 로그** 가정. 운영 데이터 확인 후 확정.
- 번들(SKU N개로 채워지는 channel variant)이 실제로 필요한지 — 1차 릴리스는 단일 SKU만 UI 노출하고, 스키마만 N:M으로 유연하게 두는 안.
- `listed_product_skus`의 channelSellerCode가 SKU 코드와 다를 수 있는데, push 시 어느 것을 사용할지(현재: channelSellerCode 우선, 없으면 SKU.code).
