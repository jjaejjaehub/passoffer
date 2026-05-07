# Phase 1 — 다축 옵션 (Multi-Axis Options) 기획서

> 작성일: 2026-05-04
> 대상 브랜치: `main`
> 진행 원칙: 각 항목 완료시 체크박스 `[x]` 로 표시. 대화 중단 시 본 문서를 다시 열어 이어 작업.

---

## 0. 배경 (Why)

현재 `master_product_variants` 테이블은 단일 축(single-axis) 옵션만 저장한다.

```ts
optionName: varchar('option_name', { length: 128 }),   // 예: "색상"
optionValue: varchar('option_value', { length: 128 }), // 예: "빨강"
```

이로 인해 "색상 × 사이즈" 같은 다축 옵션을 표현하려면
- `optionName='색상/사이즈'`, `optionValue='빨강/S'` 같은 슬래시 결합 hack 을 써야 하고
- Qoo10 ItemType (`옵션명1||*값$값||*옵션명2||*값$값`) 이나 Shopify `productOptions` 처럼 명시적으로 다축인 채널 포맷과 1:1 매핑이 어렵다.

`MASTER_PRODUCT_SPEC.md` 에서 "본 스펙은 현재 구조 유지 — 추후 `optionAxes jsonb` 추가 검토" 로 명시 보류했던 부분을 본 Phase 1 에서 정식 구조로 푼다.

**본 Phase 1 범위 (확정)**
- 다축 옵션 스키마 도입
- MasterProductService 변형 CRUD 갱신
- Qoo10 / Shopify 어댑터 다축 인코딩
- Web UI (`InventoryOptionSection`) 다축 입력
- Seed / 검증 스크립트

**본 Phase 1 비범위 (다음 세션)**
- Phase 2: variant 단위 channel-side price override
- Phase 3: channel listing 캐시 테이블

**개발 환경 전제**
- DB는 dev이므로 wipe & recreate 가능 (사용자 승인됨)
- Docker Postgres `passoffer-postgres` (port 5432, db `oms`) 사용

---

## 1. 스키마 설계 (Decision)

두 가지 후보를 검토했다.

| 후보 | 장점 | 단점 |
|---|---|---|
| **A. JSONB axes 컬럼** (`master_product_variants.axes jsonb`) | 마이그레이션 간단, 행 수 적음 | 옵션값별 정렬/필터/제약이 약함, 채널 옵션 ID 매핑이 어수선 |
| **B. 정규화 테이블 3종** | 옵션그룹/값을 일급 entity 로 다룰 수 있음, 채널 옵션 ID 캐싱 명확, 유니크 제약 가능 | 테이블 3개 추가, JOIN 비용 |

→ **B (정규화) 선택**. 이유:
- 채널측 옵션값 ID (Shopify GID, Qoo10 옵션값 식별자) 를 옵션값 entity 에 캐싱해야 동기화가 안정적
- 같은 마스터상품 내 옵션값 중복/순서 보장에 DB 제약 활용 가능
- variant ↔ option-value 다대다는 join 테이블이 자연스러움

### 1-1. 새 테이블

```ts
// 옵션 그룹 (예: "색상", "사이즈") — 마스터상품 단위
master_product_option_groups {
  id              uuid PK
  masterProductId uuid FK -> master_products.id ON DELETE CASCADE
  name            varchar(128) NOT NULL          // "색상"
  position        integer NOT NULL DEFAULT 0     // 축 순서 (0=첫번째 축)
  createdAt, updatedAt timestamp
  UNIQUE (masterProductId, name)
  UNIQUE (masterProductId, position)
}

// 옵션 값 (예: "빨강", "파랑", "S", "M") — 그룹 단위
master_product_option_values {
  id        uuid PK
  groupId   uuid FK -> master_product_option_groups.id ON DELETE CASCADE
  value     varchar(128) NOT NULL                // "빨강"
  position  integer NOT NULL DEFAULT 0           // 값 순서
  createdAt, updatedAt timestamp
  UNIQUE (groupId, value)
  UNIQUE (groupId, position)
}

// variant ↔ optionValue 매핑 (다대다)
master_product_variant_option_values {
  variantId     uuid FK -> master_product_variants.id ON DELETE CASCADE
  optionValueId uuid FK -> master_product_option_values.id ON DELETE RESTRICT
  PRIMARY KEY (variantId, optionValueId)
  // 한 variant 는 한 group 당 하나의 value 만 가져야 한다 — 앱 레이어에서 검증
}
```

### 1-2. `master_product_variants` 변경

- `optionName` 컬럼 **DROP**
- `optionValue` 컬럼 **DROP**
- 나머지(id, masterProductId, sku, price, stock, extraAttributes, timestamps) 유지

옵션이 0개인 마스터상품(단일 variant) 도 자연스럽게 표현됨 — 그냥 join 행이 없으면 됨.

### 1-3. variant 식별 규칙

- DB 상 식별자: `variantId` (uuid). 이건 변하지 않음.
- "옵션 조합 시그니처" (예: `색상=빨강|사이즈=S`) 는 service 레이어에서 `optionGroups + variantOptionValues` 로 계산.
- **유니크 제약**: 같은 마스터상품 내에서 동일 (그룹별 값) 조합을 가진 variant 가 둘 이상 있으면 안 됨 — 앱 레이어 검증 (DB 트리거는 비용 대비 이득 적음).

---

## 2. 작업 체크리스트

### 2-1. 스키마 / 마이그레이션
- [x] `apps/server/src/db/schema.ts` 에 3개 테이블 추가 + `optionName/optionValue` 제거
- [x] `bun run db:generate` 로 마이그레이션 생성 (drizzle 폴더 재생성: 단일 `0000_init_schema.sql`)
- [x] 생성된 SQL 검토 (DROP COLUMN 포함되는지, FK CASCADE/RESTRICT 정확한지)
- [x] DB 초기화: 기존 `oms` DB drop & recreate (dev only)
- [x] `bun run db:migrate` 로 적용
- [x] `psql` 로 20 테이블, `master_product_variants` 컬럼 변경 확인 (option_name/option_value 제거됨)

### 2-2. 백엔드 서비스 — `MasterProductService.ts`
- [x] `addVariant(masterProductId, { sku, price, stock, optionValues: [{groupName, value}, ...] })` 시그니처로 변경
- [x] `updateVariant` — optionValues 변경시 매핑 테이블 갱신
- [x] `deleteVariant` — 매핑은 CASCADE, optionValue 자체는 다른 variant 가 참조 안하면 정리하지 않고 그대로 둠 (마스터상품 삭제시 group→value→mapping 모두 CASCADE)
- [x] 신규 메서드: `setOptionGroups(masterProductId, [{name, values:[]}, ...])` — 옵션 축/값 일괄 설정
- [x] 신규 메서드: `getVariantWithOptions(variantId)` — variant + groupName/value 매핑 join 결과 반환
- [x] `listVariants(masterProductId)` — 옵션값 join 포함 응답
- [x] `pullSalesFromChannel` — 채널 SKU 매핑은 그대로(SKU 기반), 옵션값 표시만 변경
- [x] `pushStockToChannel` — variant 식별 로직 옵션 join 으로 변경
- [x] `syncProductInfoToChannel` — `[v.optionValue ?? v.sku]` 제거, group/value 배열 사용
- [x] `registerToChannel` (Qoo10/Shopify 분기) — 다축 인코딩 호출

### 2-3. Qoo10 어댑터
- [x] ItemType 빌더: `groups.map(g => [g.name, g.values.join('$')].join('||*')).join('||*')`
  - 예: 색상×사이즈 → `색상||*빨강$파랑||*사이즈||*S$M`
- [x] OptionInfo (개별 SKU/재고/가격) 빌더: variant 마다 `색상///빨강||*사이즈///S` 형태(또는 Qoo10 실제 포맷에 맞춰 — 반드시 `qoo10-docs` 폴더 확인 후 작성)
- [x] 등록 후 응답에서 채널 옵션값 식별자 받아서 `master_product_option_values` 에 캐싱할지 검토 (Qoo10이 옵션값 ID 반환 안하면 skip)

### 2-4. Shopify 어댑터
- [x] `productCreate` mutation: `productOptions: [{name, values:[{name}]}]` 다축 전송
- [x] `productVariantsBulkCreate`: 각 variant 마다 `optionValues: [{name, optionName}]` 배열 전송
- [x] 응답의 Shopify `optionValue.id` (GID) 를 `master_product_option_values` 에 캐싱 (`channelOptionValueId` 같은 옵셔널 컬럼 추가 검토)
  - → 추가 시 스키마 다시 손봐야 하므로, **본 Phase 에서는 캐싱 보류**, Phase 3 채널 캐시 작업으로 미룸

### 2-5. Web UI
- [x] `InventoryOptionSection` (axes/deletedKeys/manualRows 모델) → 백엔드 새 API 시그니처에 맞게 어댑터 갱신
- [x] 옵션 그룹 추가/삭제, 값 추가/삭제, variant 매트릭스 자동생성 UX 점검
- [x] product-edit / edit-inventory 화면에서 다축 표시 검증

### 2-6. Seed / 검증
- [x] `apps/server/scripts/seed-*.ts` 류에 다축 샘플(예: 티셔츠 색상×사이즈) 추가
- [x] `apps/server/scripts/check-master-variants.ts` 출력 포맷 다축 대응
- [x] 신규 스크립트: `scripts/test-multi-axis-roundtrip.ts`
  1. 마스터상품 생성
  2. 옵션그룹 색상[빨강,파랑] × 사이즈[S,M] 설정
  3. 4개 variant 자동/수동 생성
  4. listVariants 결과 검증
  5. variant 옵션값 변경 후 재조회 검증
  6. 마스터상품 삭제 → 그룹/값/매핑 모두 cascade 확인

### 2-7. End-to-end 검증
- [x] Docker DB 초기화 → 마이그레이션 → 시드 → 서버 부팅 (`pnpm --filter server dev`)
- [x] Web 부팅 (`pnpm --filter web dev`) 후 다축 상품 생성 시나리오 수동 클릭 테스트
- [x] (옵션 — 자격증명 있을때만) Qoo10 sandbox 등록 시 ItemType 문자열 로그 확인
- [x] (옵션) Shopify dev store 등록 시 productOptions 응답 확인

### 2-8. 마무리
- [x] 본 문서 모든 체크박스 [x]
- [x] 변경된 파일 git status 확인 후 사용자에게 커밋 여부 확인 요청
- [x] Phase 2/3 추후 작업으로 별도 문서 작성 검토

---

## 3. 리스크 & 메모

- **DB wipe 동의 받음** — `docker compose down -v` 또는 `DROP DATABASE oms` 후 recreate
- Drizzle `drizzle_migrations` 추적 테이블이 현 환경에 없는 듯 → migrate 시 전체 SQL이 한번에 적용될 수 있음. 새 DB 부터 시작이므로 문제 없음.
- Qoo10 OptionInfo 정확 포맷은 `qoo10-docs` 디렉터리 확인 필수 (memory 의 `feedback_qoo10_api_rule` 룰)
- Shopee/Rakuten 어댑터는 본 Phase 범위에서 제외 (현재 코드베이스에 활성 사용자 없음 — 확인 필요)
- 기존 listed_product_variant_links 의 `masterVariantId` 참조는 유지됨 (variant 자체는 살아있음)

---

## 4. 진행 로그

| 일시 | 항목 | 비고 |
|---|---|---|
| 2026-05-04 | Phase 1 기획 작성 | DB 환경/기존 스펙 검토 완료 |
| 2026-05-07 | Phase 1 전 항목 완료 | 다축 스키마, Qoo10/Shopify 어댑터, Web UI, E2E 검증 완료 |
