# WMS 어드민 UI 구현 태스크 (Sonnet 작업용)

> 원본 기획: 가상 창고 어드민 (React + Tailwind + shadcn 기반 단일 데모)
> 본 문서: PassOffer 실제 스택(Next.js 16 + Chakra UI v3 + FSD + IWMSAdapter)으로 재해석한 **실행 가능한 태스크 분해**
>
> 선결 조건: `docs/wms-vendor-abstraction-plan.md` Phase 4(WMS DB 스키마 + IWMSAdapter + Mock 어댑터 3종)가 완료되어 있어야 함. 본 문서는 Phase 6(WMS 운영 화면)에 해당.

---

## 0. 원본 기획 vs PassOffer 갭 (Sonnet이 반드시 인지할 것)

| 원본 | PassOffer | 변환 규칙 |
|---|---|---|
| React + Tailwind | Next.js 16 App Router | `app/admin/warehouses/*/page.tsx` 진입점, 실 컴포넌트는 `src/pages/admin-warehouses/*` |
| shadcn/ui (Table, Dialog, Drawer, Select, Tabs, Tree) | Chakra UI v3 | `Table.Root`, `Dialog.Root`, `Drawer.Root`, `NativeSelect.Root`, `Tabs.Root`, 트리는 자체 컴포넌트 |
| lucide-react | lucide-react | 그대로 사용 |
| useState/useReducer만 | TanStack Query v5 + useState/useReducer | 서버 상태는 React Query, UI 상태만 useState |
| mock JSON 인-컴포넌트 | `apps/server/src/adapters/wms/Mock*Adapter.ts` | mock은 어댑터 안에 있고, 화면은 `entities/warehouse/api`로 호출 |
| 단일 가상 창고 가정 | 멀티 벤더 (self / cj_logistics / sftp_batch) | 모든 화면 상단에 창고 셀렉터 + 벤더 뱃지, capability에 따라 컬럼 동적 |
| 화려한 그라데이션/이모지 금지 | 동일 + 한글 라벨 우선, Pretendard | 톤 그대로 계승 |
| 영어 키 (Expected Inbound 등) | 한글 키 (입고 예정 관리 등) | 사이드바/탭 라벨은 한글, 코드 식별자는 영어 |

**원본의 5개 모듈 → PassOffer 라우트 매핑:**

| 원본 모듈 | PassOffer 라우트 | 비고 |
|---|---|---|
| ① Expected Inbound | `/admin/warehouses/inbound` | B-4-3 |
| ② WMS Inventory Viewer | `/admin/warehouses/inventory` | B-4-2 |
| ③ Inventory Adjustment | `/admin/warehouses/adjustments` | B-4-4 |
| ④ Inventory History | `/admin/warehouses/history` | B-4-5 |
| ⑤ Location Management | `/admin/warehouses/locations` | B-4-6 |

---

## 1. 공통 인프라 (모든 모듈 공통, 가장 먼저 작업)

### 1-1. 글로벌 창고 셀렉터 (헤더/사이드바)
- **위치**: `apps/web/src/widgets/admin-warehouses/WarehouseSelector.tsx` (신규)
- **상태**: URL `?warehouseId=...` query param + Zustand-less context (React Query selectAtom 패턴)
- **표시 항목**: 벤더 뱃지 약자(`<VendorBadge>`) + 창고명 + 연결 상태 점(`<ConnectionStatusDot>`)
- **선택 시 모든 5개 모듈에 전파** — 각 모듈은 `useSelectedWarehouseId()` 훅으로 구독
- 미선택 상태: 모듈 내부에서 빈 상태 카드 노출 ("좌측에서 창고를 선택하세요")

### 1-2. 공통 디자인 토큰 / 시각 언어
원본 기획의 "차분한 어드민 톤 + 강조색 1개" 원칙을 PassOffer에 맞춰 다음으로 고정:
- 배경: `bg.subtle` (Chakra v3 시멘틱 토큰)
- 강조색: `colorPalette="blue"` (테이블 행 hover, primary 버튼)
- 상태 색: `green`(완료/연결), `amber`/`yellow`(대기/지연), `red`(에러/실패), `gray`(미연결/품절)
- 텍스트 기본: `fontSize="sm"` (정보 밀도)
- 테이블: `Table.Root size="sm"` + sticky header + zebra (`<Table.Row _odd={{ bg: 'bg.muted' }}>`)

### 1-3. 공통 컴포넌트 (이미 Phase 2에서 만들 예정 — 재사용)
- `<VendorBadge vendor={WMSVendor} />` — 약자 + 컬러 칩 (self=슬레이트, cj_logistics=보라, hanjin=청록 등)
- `<ConnectionStatusDot status={ConnectionStatus} />`
- `<FreshnessLabel fetchedAt freshness />`
- `<CapabilityBadgeGroup capabilities />` — 지원 기능 한눈에

### 1-4. 상태 색상 + 아이콘 + 텍스트 3중 표시 규칙
원본 기획의 "색맹 고려 — 색상 + 텍스트 + 아이콘 3중 표시" 원칙을 강제하기 위해 헬퍼 신설:
- **위치**: `apps/web/src/shared/ui/StatusBadge.tsx` (신규)
- 사용처: 입고 배치 상태, 이동 상태, LOT 만료 임박 등 모든 상태 표시
- 시그니처: `<StatusBadge tone="success|warning|danger|neutral" icon={IconType} label="대기" />`

### 1-5. 빈 상태 / 로딩 / 에러 상태 표준 (필수 — 원본 기획 명시 요구)
- `<EmptyState title icon description action />` — 검색 결과 없음, 데이터 없음
- `<LoadingState />` — Chakra `Skeleton`
- `<ErrorState error onRetry />`
- 모든 테이블/리스트는 위 3가지 상태를 모두 처리해야 함 (Sonnet이 자주 빠뜨리는 부분)

### 1-6. 사이드바 메뉴 추가
- 기존 사이드바에 "창고 관리" 그룹 신설
  - 입고 예정 관리 (`/admin/warehouses/inbound`)
  - 재고 조회 (`/admin/warehouses/inventory`)
  - 재고 이동/조정 (`/admin/warehouses/adjustments`)
  - 재고 이력 (`/admin/warehouses/history`)
  - 로케이션 관리 (`/admin/warehouses/locations`)
- 그룹 상단에 글로벌 창고 셀렉터(1-1) 노출

---

## 2. 모듈 ① 입고 예정 관리 (`/admin/warehouses/inbound`)

> 가장 중요한 의사결정 포인트: **Excel 검증 결과를 행 단위로 즉시 보여주고, 검증 실패 행은 전송 불가**. 운영자가 잘못된 파일을 모르고 전송하는 사고가 가장 비싼 사고다.

### 2-1. 페이지 도움말 (상단)
"엑셀로 입고 예정 데이터를 업로드하면 검증 후 WMS에 전송됩니다. 검증 실패 행이 있으면 그 배치는 전송할 수 없습니다."

### 2-2. 컴포넌트 트리
```
InboundPage
├── PageHeader (제목 + 도움말)
├── BatchListSection
│   ├── BulkActionBar (선택된 배치 수 + [일괄 전송])
│   ├── BatchTable (배치ID, 등록일, 행 개수, 상태, vendor, fetchedAt, actions)
│   └── EmptyState
├── ExcelUploadDropzone (드래그앤드롭)
└── BatchDetailDrawer (행 클릭 시 우측에서 슬라이드)
    ├── BatchMetaSection
    ├── ParsedRowsTable (검증 에러 하이라이트)
    └── ActionFooter ([WMS로 전송] / [닫기])
```

### 2-3. Excel 업로드 + 검증
- **라이브러리**: `xlsx` (또는 `exceljs`) — 미설치 시 추가 (`bun add xlsx`)
- **드롭존**: 화면 상단 또는 빈 상태일 때 큰 카드. 드래그 오버 시 강조 outline
- **파싱 후 검증** (모두 행 단위 결과로):
  1. 필수 컬럼 누락: `master_product_code`, `quantity`, `expected_at`
  2. SKU 미등록: `master_products` 조회 결과 없음 → 행 빨간 배경 + 사유 셀
  3. 수량 ≤ 0
  4. 날짜 형식 오류
- **파싱 결과 미리보기 테이블**: 행별 상태 컬럼(✓/✗ + 사유), 정상 행만 카운트하여 "정상 N행 / 오류 M행" 요약 노출
- **저장**: "이 배치 등록" 버튼 → 정상 행만 `inbound_orders` insert (status=`pending_dispatch`). 오류가 있으면 버튼 disabled + tooltip("오류 행을 수정 후 다시 업로드하세요")

### 2-4. 배치 테이블
| 컬럼 | 비고 |
|---|---|
| 체크박스 | 다중 선택 |
| 배치ID | 클릭 → 상세 Drawer |
| 등록일 | `date-fns` format |
| 행 개수 | 정상행 |
| 상태 | `<StatusBadge>` (pending / instructed / received / canceled) |
| Vendor | `<VendorBadge>` |
| Freshness | `<FreshnessLabel>` |
| 액션 | [상세보기] [WMS로 전송] |

- **상태별 색**: pending=amber, instructed=blue, received=green, canceled=gray
- **WMS로 전송 버튼**: `pending_dispatch` 상태에서만 활성. 그 외 disabled + tooltip "이미 전송됨/취소됨"
- **상태 전환 confirm dialog**: "WMS에 전송하시겠습니까? 이 작업은 되돌릴 수 없습니다."

### 2-5. 다중 선택 일괄 전송
- 체크박스로 여러 배치 선택 → 상단 BulkActionBar 노출 ("3개 선택됨 [일괄 전송]")
- 일괄 전송 시 `Promise.allSettled`로 어댑터 호출, 결과는 토스트로 "성공 N / 실패 M, 실패 건은 목록에서 확인하세요"

### 2-6. 데이터 / API
- **엔티티**: `apps/web/src/entities/inbound-batch/`
  - `model/types.ts` — `InboundBatch`, `InboundRow`
  - `api/inboundQueries.ts` — `useInboundBatches({ warehouseId })`
  - `api/inboundMutations.ts` — `useCreateInboundBatch`, `useDispatchToWMS`
- **서버 라우트**: `apps/server/src/routes/warehouses/inbound.ts`
  - `POST /api/warehouses/:id/inbound/batches` (Excel 파싱 결과 저장)
  - `POST /api/warehouses/:id/inbound/batches/:batchId/dispatch` → `IWMSAdapter.pushInboundInstruction()` 호출
- **목 데이터**: 최소 배치 10개, 각 배치당 행 5~30개

### 2-7. 모듈 ① 완성 기준
- [ ] 잘못된 Excel 업로드 → 행별 에러가 정확히 표시됨
- [ ] 정상/에러 혼재 시 정상 행만 등록되고 에러 행은 등록 안 됨
- [ ] pending이 아닌 배치의 [WMS로 전송] 버튼은 disabled + tooltip
- [ ] 다중 선택 후 일괄 전송 동작
- [ ] Empty / Loading / Error 상태 모두 화면에서 확인

---

## 3. 모듈 ② 재고 조회 (`/admin/warehouses/inventory`)

> 가장 중요한 의사결정 포인트: **운영자는 "지금 어디에 얼마나 있는지" 1초 안에 보고 싶어한다.** SKU 그룹/LOT 그룹 토글이 핵심. 만료 임박 LOT은 절대 놓치면 안 된다.

### 3-1. 페이지 도움말
"창고별로 LOT 단위 재고와 SKU 단위 합계를 조회합니다. 유통기한이 30일 이하인 LOT은 빨간색으로 강조됩니다."

### 3-2. 컴포넌트 트리
```
InventoryPage
├── PageHeader (창고 셀렉터는 글로벌 — 여기선 vendor + 연결 상태 점만)
├── ToolbarSection
│   ├── SearchInput (debounced 300ms — SKU/LOT/로케이션)
│   ├── GroupByToggle ([LOT 단위 | SKU 단위])
│   ├── ExpiryFilter ([전체 | 임박 | 만료])
│   └── RefreshButton (강제 새로고침 + freshness 표시)
├── InventoryTable (capability에 따라 LOT/Location 컬럼 동적 표시)
└── Pagination
```

### 3-3. 테이블 (LOT 단위 모드)
| 컬럼 | 정렬 | capability 의존 | 비고 |
|---|---|---|---|
| SKU | ✓ | — | |
| LOT번호 | ✓ | `supportsLotTracking` | 미지원 시 컬럼 숨김 |
| 입고일 | ✓ | — | |
| 유통기한 | ✓ | `supportsLotTracking` | 30일 이내 = 빨간 텍스트 + Warning 아이콘 + "임박" 뱃지 |
| 로케이션 | — | `supportsLocationTree` | 미지원 시 컬럼 숨김 |
| 수량 | ✓ | — | |
| 상태 | — | — | normal / expired / damaged 등 |

- **만료 임박 행**: 행 자체에 `bg="red.subtle"` + 유통기한 셀에 `<StatusBadge tone="danger" icon={AlertTriangle} label="임박" />`
- **수량 0 행**: `color="fg.muted"` + 텍스트 흐리게 ("품절")

### 3-4. SKU 그룹 모드 토글
- "Group by SKU" 토글 ON → 같은 SKU의 LOT 행 합산
- 합계 수량은 `fontWeight="bold"` + accent 컬러
- LOT 컬럼 등은 "N개 LOT" 표기 (확장 시 펼침)
- expand/collapse: 행 클릭 → 하위 LOT 행 펼침 (Chakra `Collapsible`)

### 3-5. 검색 / 정렬 / 페이지네이션
- 검색: 300ms debounce, 클라이언트 필터(데이터 1000행 이하 가정) — 그 이상이면 서버 필터로 전환 (TODO 주석)
- 정렬: 컬럼 헤더 클릭 → asc/desc 토글, ▲▼ 아이콘
- 페이지네이션: page size 50, Chakra `Pagination` (없으면 직접 컴포넌트)

### 3-6. capability 기반 컬럼 동적 표시
- `<InventoryTable warehouseCapabilities={...} />`로 props 전달
- 미지원 컬럼은 렌더링 자체를 하지 않음 (회색으로 보여주지 말 것)
- 단, "LOT 추적이 지원되지 않는 창고입니다" 정보 행을 테이블 상단에 한 번 노출

### 3-7. 데이터 / API
- **엔티티**: `apps/web/src/entities/warehouse-stock/`
  - `useWarehouseStocks({ warehouseId, search, groupBy, expiryFilter })`
- **서버**: `GET /api/warehouses/:id/stocks` → `IWMSAdapter.fetchInventory()` 호출
- **응답에 freshness / fetchedAt 포함** — 화면 우상단에 표시
- **목 데이터**: SKU 20개 × LOT 평균 3~5개 = 약 60~100행

### 3-8. 모듈 ② 완성 기준
- [ ] LOT/SKU 토글 시 데이터 즉시 재집계
- [ ] 만료 임박 LOT 강조 표시 (3중 — 색 + 아이콘 + 텍스트)
- [ ] 검색 debounce 동작
- [ ] 컬럼 정렬 동작
- [ ] capability 미지원 컬럼 자동 숨김
- [ ] freshness 라벨 + 강제 새로고침 동작

---

## 4. 모듈 ③ 재고 이동/조정 (`/admin/warehouses/adjustments`)

> 가장 중요한 의사결정 포인트: **실수 방지가 모든 것을 이긴다.** Step 1에서 현재 재고 표시, Step 2에서 초과 수량 즉시 차단, Step 3에서 Before/After 비교 + 사유 필수. 확정 버튼은 모든 검증 통과 + 사유 선택 후에만 활성.

### 4-1. 페이지 도움말
"재고를 다른 로케이션으로 이동하거나 조정합니다. 모든 작업은 되돌릴 수 없으며, 사유 코드 입력이 필수입니다."

### 4-2. 컴포넌트 트리 (3-Step Wizard)
```
AdjustmentPage
├── PageHeader
├── StepperHeader (1. 출발 / 2. 도착·수량 / 3. 검토·확정)
├── StepBody (현재 step에 따라 분기)
│   ├── Step1_SourceSelect
│   │   ├── LocationPicker (출발 로케이션 — 트리 또는 검색)
│   │   ├── SkuLotPicker (SKU/LOT 선택)
│   │   └── CurrentStockDisplay (선택 결과: "현재 재고: 120개 @ A동-2층-3랙")
│   ├── Step2_DestinationAndQty
│   │   ├── LocationPicker (도착 로케이션, capability에 따라 다른 창고도 허용)
│   │   ├── QuantityInput (현재 재고 옆에 표시 + 실시간 검증)
│   │   └── ValidationMessage (수량 > 현재 재고 → 즉시 빨간색)
│   └── Step3_PreviewAndConfirm
│       ├── BeforeAfterPanel (좌: 이동 전, 우: 이동 후)
│       ├── ReasonCodeSelect (필수 — 손상/재배치/실사조정/반품)
│       ├── MemoTextarea (선택)
│       └── ConfirmButton (유효성 통과 + 사유 선택 후에만 활성)
└── ConfirmDialog ("이 작업은 되돌릴 수 없습니다. 진행하시겠습니까?")
```

### 4-3. Step 1 — 출발 선택
- 좌측: 로케이션 선택 (트리 컴포넌트 — 모듈 ⑤와 공유 또는 간소화 버전)
- 우측: SKU/LOT 검색 input → autocomplete 결과 (해당 로케이션의 재고만)
- 선택 완료 시 큰 글씨로 "**현재 재고: 120개**" + 메타("입고일 / 유통기한 / 상태") 표시
- 다음 단계 버튼: 출발 로케이션 + SKU/LOT 모두 선택해야 활성

### 4-4. Step 2 — 도착 + 수량
- 도착 로케이션: 같은 창고 내(`supportsCrossWarehouseTransfer=false`) vs 다른 창고도 허용(`true`)
- 같은 출발/도착 차단 (validation)
- 수량 input: 옆에 항상 "현재 재고 / 120" 형태로 표시
- 즉시 검증: `quantity > current` → input 빨간 border + 메시지 "현재 재고를 초과할 수 없습니다"
- 0 또는 음수 차단

### 4-5. Step 3 — 미리보기 + 확정
- **Before/After 좌우 패널**:
  ```
  ┌─ 이동 전 ──────┐  ┌─ 이동 후 ──────┐
  │ A동-2층-3랙   │  │ A동-2층-3랙   │
  │ SKU-001       │  │ SKU-001       │
  │ 수량: 120     │  │ 수량: 90      │ ← 굵은 빨강
  │               │  │               │
  │ B동-1층-1랙   │  │ B동-1층-1랙   │
  │ SKU-001       │  │ SKU-001       │
  │ 수량: 50      │  │ 수량: 80      │ ← 굵은 파랑
  └───────────────┘  └───────────────┘
  ```
- 사유 코드 Select: 옵션은 어댑터의 `capabilities.reasonCodeMapping`에서 가져옴 (없으면 기본 4종)
- 확정 버튼: `quantity 유효 && reasonCode 선택됨` 일 때만 enabled
- 확정 클릭 → confirm dialog → 확인 시 mutation 호출

### 4-6. 외부 창고 처리
- `IWMSAdapter.requestAdjustment()` 응답이 `pending_external`이면 결과 토스트에 "외부 창고에 요청이 전달되었으며, 평균 처리 시간은 N분입니다" 표시
- 결과 화면에 vendorRef도 노출 (추적용)

### 4-7. 데이터 / API
- **엔티티**: `apps/web/src/entities/stock-movement/`
- **서버**: `POST /api/warehouses/:id/movements` → `IWMSAdapter.requestAdjustment()`
- **사유 코드**: `packages/types`에 `AdjustmentReason = 'damage' | 'relocate' | 'audit' | 'return'` enum

### 4-8. 모듈 ③ 완성 기준
- [ ] 3 Step wizard 진행 정상 (이전/다음)
- [ ] Step 1에서 현재 재고 표시
- [ ] Step 2에서 수량 초과 시 즉시 차단
- [ ] Step 3에서 Before/After 시각적으로 명확히 비교됨
- [ ] 사유 미선택 시 확정 버튼 disabled
- [ ] 확정 시 confirm dialog 통과 후에만 mutation 실행
- [ ] 외부 창고 응답이 `pending_external`일 때 적절히 안내

---

## 5. 모듈 ④ 재고 이력 (`/admin/warehouses/history`)

> 가장 중요한 의사결정 포인트: **이력은 사후 추적 도구다.** 시간대별 그룹핑 + Before/After 명확 표시 + 작업자/사유 추적이 필수.

### 5-1. 페이지 도움말
"창고에서 발생한 모든 입고/출고/이동/조정 이벤트를 시간순으로 조회합니다."

### 5-2. 컴포넌트 트리
```
HistoryPage
├── PageHeader
├── FilterBar
│   ├── TypeMultiSelect (입고/출고/이동/조정)
│   ├── DateRangePicker (기본 최근 30일)
│   ├── SkuSearchInput
│   └── LocationFilter
├── TimelineList (날짜별 그룹핑)
│   └── DayGroup
│       ├── DateHeader ("2026-04-28 (월요일)")
│       └── EventCard[] (가로 카드 — 클릭 시 Drawer)
└── EventDetailDrawer
    ├── BeforeAfterLargeNumbers ("120 → 90" 큰 글씨)
    ├── EventMeta (작업자, 시각, 사유, 메모)
    └── RelatedRefs (배치ID 링크, 이동건 ID 링크)
```

### 5-3. 타임라인 카드
- 가로 레이아웃: `[아이콘] [유형 뱃지] [SKU] [수량 변화 +10/-5] [시각] [작업자]`
- 유형별 아이콘:
  - 입고: `PackagePlus` (파랑)
  - 출고: `PackageMinus` (보라)
  - 이동: `ArrowRightLeft` (청록)
  - 조정: `Settings2` (회색)
- 수량 변화: `+10` 녹색 / `-5` 빨강
- 호버 시 카드 살짝 강조, 클릭 → Drawer

### 5-4. 상세 Drawer
- 우측에서 슬라이드 (Chakra `Drawer.Root placement="end"`)
- 상단: Before/After 큰 숫자 비교 (`fontSize="3xl"`)
- 메타: 작업자, 시각, 사유 코드(라벨로 변환 — '재배치' 등), 메모
- 관련 레퍼런스: 입고배치 / 이동건 → 클릭 시 해당 모듈로 navigate
- 외부 발생 이벤트는 별도 아이콘 (`<Cloud>` 등) + "외부 시스템에서 발생" 라벨

### 5-5. 데이터 / API
- **서버**: `GET /api/warehouses/:id/history?from&to&types[]&sku&location` → `IWMSAdapter.fetchHistory()`
- **페이지네이션**: 무한 스크롤(`useInfiniteQuery`) 또는 page-based 둘 중 선택 (운영자 워크플로우에 무한 스크롤이 더 자연스러움 — 무한 스크롤 권장)

### 5-6. 모듈 ④ 완성 기준
- [ ] 4종 유형 필터 동작
- [ ] 날짜 범위 필터 동작
- [ ] 날짜별 그룹핑 정상
- [ ] 카드 클릭 → Drawer 정확한 정보 표시
- [ ] Before/After 큰 숫자 비교 가독성 OK
- [ ] 외부 이벤트 별도 표시

---

## 6. 모듈 ⑤ 로케이션 관리 (`/admin/warehouses/locations`)

> 가장 중요한 의사결정 포인트: **재고 있는 노드는 절대 삭제 불가**. 노드별 현재 재고를 트리에서 한눈에 보여줘야 운영자가 어디부터 정리할지 결정 가능.

### 6-1. 페이지 도움말
"창고의 로케이션(구역/랙/셀) 구조를 관리합니다. 재고가 있는 로케이션은 삭제할 수 없습니다."

### 6-2. 컴포넌트 트리
```
LocationsPage (좌우 2 컬럼 레이아웃)
├── LeftPanel (40%)
│   ├── TreeToolbar ([+ 노드 추가] [전체 펼침/접음])
│   └── LocationTree (재귀 컴포넌트)
│       └── TreeNode
│           ├── ExpandButton
│           ├── NodeLabel + StockBadge (재고 수량)
│           └── HoverActions ([+] [✎] [🗑])
└── RightPanel (60%)
    ├── SelectedNodeHeader (경로 + 벤더 뱃지 + capacity progress bar)
    ├── StockListTable (해당 로케이션의 재고)
    └── AuditMetaSection (생성일, 수정일, 마지막 동기화)
```

### 6-3. Tree 컴포넌트
- Chakra UI v3에는 빌트인 Tree 없음 → 자체 구현
  - `apps/web/src/widgets/admin-warehouses/LocationTree/` 신규
  - 재귀 `<TreeNode depth={n}>` 컴포넌트, 좌측 padding으로 들여쓰기
  - 펼침/접음 상태는 컴포넌트 로컬 (`useState<Set<string>>`)
- **계층**: 창고 > 구역 > 랙 > 셀 (총 4 depth, capability에 따라 더 얕을 수 있음)
- **노드별 재고 뱃지**: 자식 노드 합산 수량 표시 (`<Badge>120</Badge>`)
- **빈 로케이션**: 회색 표시
- 미지원 창고: "이 창고는 로케이션 트리를 지원하지 않습니다" + 평면 리스트로 fallback

### 6-4. 우측 패널
- 선택된 노드 메타: 전체 경로(`A동 > 2층 > 3랙`), 벤더 뱃지
- **용량 사용률**: progress bar (`current / capacity`), capacity가 정의된 경우만
- 재고 리스트: 해당 로케이션의 모든 재고 행 (SKU, LOT, 수량) — 모듈 ②와 동일한 렌더링 재사용
- AuditMeta: 생성일, 마지막 수정일

### 6-5. 노드 추가/수정/삭제
- **추가**: 부모 노드의 [+] 버튼 → Dialog (코드, 이름, capacity)
- **수정**: 노드의 [✎] 버튼 → 같은 Dialog (수정 모드)
- **삭제**: 노드의 [🗑] 버튼
  - **재고 0인 경우만**: confirm dialog → 삭제
  - **재고 있는 경우**: 버튼 disabled + tooltip "재고가 있는 로케이션은 삭제할 수 없습니다 (현재 N개)"
  - 자식 노드가 있는 경우: 자식까지 검사 (재귀)
- 외부 창고는 모든 mutation 차단 + tooltip "외부 시스템에서만 변경 가능합니다"

### 6-6. 데이터 / API
- **엔티티**: `apps/web/src/entities/warehouse-location/`
- **서버**: `GET /api/warehouses/:id/locations` (트리 응답), `POST/PATCH/DELETE`
- **목 데이터**: 자체 창고는 4 depth × 평균 fanout 3 = 약 80개 노드, 일부에만 재고

### 6-7. 모듈 ⑤ 완성 기준
- [ ] 트리 펼침/접음 동작
- [ ] 노드별 재고 수량 정확히 합산 표시
- [ ] 노드 클릭 시 우측 패널에 정보 표시
- [ ] 재고 있는 노드 삭제 차단 (3중 — 버튼 + tooltip + 안내 메시지)
- [ ] capacity progress bar 정상
- [ ] 미지원 창고는 평면 리스트로 fallback

---

## 7. 작업 순서 (Sonnet에게 전달할 단계)

각 단계는 별도 PR. 단계마다 `bun run build` + `bun run test` 통과 후 다음 단계로.

### Step 1: 공통 인프라 (PR 1개)
- [ ] §1-1 글로벌 창고 셀렉터
- [ ] §1-2 디자인 토큰 정리 (theme override 필요 시)
- [ ] §1-4 `<StatusBadge>` 컴포넌트
- [ ] §1-5 `<EmptyState>`, `<LoadingState>`, `<ErrorState>`
- [ ] §1-6 사이드바 메뉴 5개 추가 (페이지는 빈 셸로)

### Step 2: 모듈 ② 재고 조회 (PR 1개)
- 가장 단순하고 다른 모듈에서 재사용할 InventoryTable이 나와서 먼저
- §3 전부

### Step 3: 모듈 ⑤ 로케이션 관리 (PR 1개)
- 트리 컴포넌트가 모듈 ③에서 재사용됨
- §6 전부

### Step 4: 모듈 ① 입고 예정 (PR 1개)
- Excel 파싱 의존성 추가 + 검증 로직
- §2 전부

### Step 5: 모듈 ③ 재고 이동/조정 (PR 1개)
- 모듈 ② 테이블 + 모듈 ⑤ 트리 재사용
- §4 전부

### Step 6: 모듈 ④ 재고 이력 (PR 1개)
- 다른 모듈에서 생성된 이벤트가 모이는 종착점
- §5 전부

### Step 7: 통합 검증 (PR 1개)
- e2e 시나리오: 입고 등록 → WMS 전송 → 재고 조회에서 확인 → 다른 로케이션으로 이동 → 이력에서 확인
- capability 토글 시 모든 모듈에서 컬럼/버튼이 일관되게 변하는지 검증
- 빈/로딩/에러 상태 모든 페이지에서 시각적으로 확인

---

## 8. 사용자 결정 필요 항목

다음 항목은 작업 시작 전 사용자 확인 필요:

1. **선결**: `docs/wms-vendor-abstraction-plan.md`의 Phase 4(WMS 스키마 + IWMSAdapter + Mock 어댑터)가 완료된 후 본 작업 시작 — 동의?
2. **Excel 라이브러리**: `xlsx` vs `exceljs`. 단순 파싱이면 `xlsx`(가벼움) 권장.
3. **무한 스크롤 vs 페이지네이션**: 모듈 ④(이력)는 무한 스크롤, 모듈 ②(재고)는 페이지네이션 — 동의?
4. **사유 코드 마스터**: `damage / relocate / audit / return` 4종으로 시작 + 어댑터별 매핑 — 추가 사유가 있는지?
5. **mock 데이터 규모**: SKU 20개 / LOT 60~100개 / 로케이션 80개 / 입고 배치 10개 — OK?
6. **PR 단위**: 위 §7의 7개 단계 = 7개 PR — 사이즈 OK?

답변 후 Step 1부터 순차 시작.

---

## 9. 절대 하지 말 것 (원본 + PassOffer 둘 다)

- ❌ Tailwind/shadcn 직접 사용 — 반드시 Chakra v3
- ❌ 화면 컴포넌트 안에 `if (vendor === 'cj')` 분기
- ❌ 이모지/그라데이션/Instrument Serif
- ❌ FSD 의존 방향 위배 (entities → features → widgets → pages)
- ❌ 파괴적 액션을 confirm 없이 실행
- ❌ 비활성 버튼에 tooltip 누락
- ❌ Empty/Loading/Error 상태 누락
- ❌ 색상만으로 상태 구분 (반드시 색 + 아이콘 + 텍스트 3중)
- ❌ 외부 라이브러리 임의 추가 — Excel 파서 외에는 추가 전 확인
