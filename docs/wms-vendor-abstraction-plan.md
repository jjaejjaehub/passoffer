# WMS 벤더 추상화 레이어 — PassOffer 적용 기획

> 원본 기획(가상 창고 어드민)을 PassOffer OMS 구조에 맞게 재해석한 문서.
> 멀티채널 OMS의 **기존 IChannelAdapter 패턴**을 **WMS(3PL) 도메인까지 확장**하는 것이 목표.

---

## 0. 컨텍스트 정리 (왜 이 작업이 필요한가)

### PassOffer의 현재 상태
- **OMS(주문관리)** 영역은 이미 멀티 벤더 추상화가 되어 있음
  - `packages/types/src/index.ts` 의 `IChannelAdapter` 인터페이스
  - `Qoo10Adapter`, `ShopifyAdapter`, `ShopeeAdapter`, `RakutenAdapter` 구현체
  - `ChannelService`가 어댑터 dispatcher 역할
- **WMS(창고/재고)** 영역은 아직 도메인이 없음
  - 현재 `inventory`는 채널의 재고 조회/조정에 한정 (Qoo10·Shopify의 채널측 재고)
  - 우리 자체 창고나 외부 3PL 창고와 연동된 in-house 재고 개념 없음
- DB 스키마에 `warehouse`, `stock_location`, `lot` 같은 테이블 부재

### 원본 기획과 우리 상황의 차이
| 원본 | PassOffer |
|---|---|
| 가상 창고 → 실제 WMS 전환 | 신규 WMS 도메인 추가 |
| 단일 가상창고 가정 | 채널만 멀티 벤더, 창고는 미존재 |
| 어댑터 패턴 신규 도입 | 채널에서는 이미 사용 중 (재활용 가능) |
| 화면 톤: 크림+러스트+Instrument Serif | 우리 톤: Chakra + 그레이스케일 + 한글 위주 |

### 결론: 두 가지 작업으로 분리해야 함
- **Track A (선결):** 기존 IChannelAdapter에 capability/freshness/연결 상태 메타를 보강
  → 화면이 채널별 차이를 매끄럽게 흡수하도록 개선
- **Track B (신규):** WMS 도메인을 새로 도입
  → `IWMSAdapter` 인터페이스, 창고 연결 관리 페이지, 재고/입고/이동 화면

이 문서는 두 트랙을 순차적으로 진행하는 마스터 플랜.

---

## 1. 기본 원칙 (반드시 지킬 것)

### 1-1. Adapter Pattern을 WMS에도 동일하게 적용
- 채널과 동일하게 `IWMSAdapter` 인터페이스를 통해 모든 WMS 추상화
- 화면 코드에 `if (vendor === 'cj') {...}` 분기 절대 금지
- 벤더별 차이는 어댑터 내부 + capability 플래그로만 흡수

### 1-2. Capability 선언 방식 (WMS와 채널 모두에 도입)
- 각 어댑터가 지원 기능을 capability flag로 선언
- UI는 capability에 따라 컬럼/버튼/탭 노출 자동 결정
- 미지원 기능은 **숨기는 게 기본**, 숨길 수 없으면 회색 + 자물쇠 + tooltip

### 1-3. 데이터 신선도(freshness) 명시
- 모든 외부 API 결과 row에 `fetchedAt`, `freshness('fresh' | 'stale' | 'unknown')` 메타 부착
- 5분 이내 fresh / 1시간 이내 ok / 그 이상 stale (회색 처리 + 배지)
- 일배치 창고는 "다음 동기화: 23:00" 카운트다운

### 1-4. 가상 ↔ 실제 전환 흔적 없이
- mock adapter ↔ real adapter 교체만으로 동작
- 화면은 어떤 벤더인지 모르고 동작 (vendor-agnostic)

### 1-5. PassOffer 기존 톤 유지
- Chakra UI v3 + 기존 회색 기반 톤
- Pretendard / system 폰트 (Instrument Serif 도입 안 함 — 일관성 유지)
- 벤더 뱃지는 **약자 + 컬러 칩** (CJ는 보라톤, 한진은 청록, 자체는 슬레이트)
- FSD 아키텍처 준수 (`apps/web/src/`)

---

## 2. Track A — 채널 어댑터 강화 (선결 과제)

### A-1. IChannelAdapter에 capability + meta 추가

**현재 (`packages/types/src/index.ts:369-387`):**
```ts
export interface IChannelAdapter {
  validateCredential(): Promise<boolean>;
  getOrders?(...): Promise<Order[]>;
  // ... 옵셔널 메서드들
}
```

**개선:**
```ts
export type ChannelVendor = 'QOO10_JP' | 'SHOPIFY' | 'SHOPEE' | 'RAKUTEN';
export type SyncMode = 'realtime' | 'polling_5m' | 'polling_1h' | 'daily_batch' | 'manual';
export type ConnectionStatus = 'connected' | 'degraded' | 'disconnected' | 'pending';
export type Freshness = 'fresh' | 'stale' | 'unknown';

export interface ChannelCapabilities {
  supportsOrderFetch: boolean;
  supportsClaimFetch: boolean;
  supportsProductRegister: boolean;
  supportsProductUpdate: boolean;
  supportsInventoryRead: boolean;
  supportsInventoryWrite: boolean;
  supportsRealtimeStock: boolean;
  supportsBulkOperations: boolean;
}

export interface SyncMeta {
  sourceVendor: ChannelVendor;
  fetchedAt: string;
  freshness: Freshness;
  isAuthoritative: boolean;
}

export interface IChannelAdapter {
  vendor: ChannelVendor;
  capabilities: ChannelCapabilities;
  syncMode: SyncMode;
  testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
  // ... 기존 옵셔널 메서드 그대로
}
```

### A-2. 채널 연결 모니터링 페이지 신설 — `/settings/channels/health`

기존 `/settings/channels`는 API 키 등록만 담당.
신규 페이지에서는:
- 각 채널의 **실시간 연결 상태** 점 인디케이터 (녹/호박/회/적)
- 마지막 동기화 시각
- 평균 응답 latency
- 최근 24h 에러 카운트
- "지금 연결 테스트" 버튼 → `testConnection()` 호출
- Capabilities 뱃지 묶음 (지원 기능 한눈에 보기)

### A-3. 기존 화면에 vendor 뱃지 + freshness 뱃지 일괄 적용

| 페이지 | 적용 내용 |
|---|---|
| `/orders` | 주문 row에 vendor 뱃지, 상세 드로어에 freshness |
| `/products` | Qoo10/Shopify 통합 목록 시 vendor 뱃지 |
| `/inventory` | 채널 카드에 연결 상태 점 + freshness, 강제 새로고침 버튼 |
| `/master-products`의 listed-products 탭 | (이미 일부 구현됨) 채널 확인 결과를 freshness로 시각화 |
| `/dashboard` | 채널별 KPI 카드에 연결 상태 표시 |

### A-4. capability 기반 조건부 렌더링 적용
- Shopee/Rakuten은 일부 메서드가 stub → 미지원 capability 표시
- 화면에서 미지원 액션 버튼은 자동 숨김
- 어쩔 수 없이 노출되는 곳은 회색 + 자물쇠 + "이 채널은 X 기능을 지원하지 않습니다" tooltip

---

## 3. Track B — WMS 도메인 신규 도입

### B-1. DB 스키마 신규

```sql
-- 창고 마스터
warehouses
  id, user_id, code, name, vendor (enum), sync_mode, status,
  capabilities_json, field_mapping_json, config_json (endpoint, account_id, api_key_encrypted),
  last_sync_at, created_at, updated_at

-- 로케이션 (벤더마다 depth 다름)
warehouse_locations
  id, warehouse_id, parent_id, code, name, level, full_path

-- WMS 재고 (마스터상품 ↔ 창고 ↔ 로케이션 매핑)
warehouse_stocks
  id, warehouse_id, master_product_id, variant_sku,
  location_id, lot_code, quantity, reserved_quantity,
  source_vendor, fetched_at, freshness, last_sync_at

-- 입고예정
inbound_orders
  id, warehouse_id, status (pending_dispatch | instructed | received | canceled),
  vendor_ref, expected_at, created_at

-- 재고이동/조정
stock_movements
  id, warehouse_id, type (inbound | outbound | transfer | adjustment),
  status (applied | pending_external | failed),
  vendor_ref, reason_code, payload_json, created_at
```

### B-2. IWMSAdapter 인터페이스 (신규 — `packages/types`)

```ts
export type WMSVendor = 'self' | 'cj_logistics' | 'hanjin' | 'lotte' | 'coupang_ff' | 'custom';

export interface WMSCapabilities {
  supportsRealtimeStock: boolean;
  supportsLotTracking: boolean;
  supportsLocationTree: boolean;
  locationDepth: number;
  supportsBatchInbound: boolean;
  supportsRowLevelAdjustment: boolean;
  supportsCrossWarehouseTransfer: boolean;
  reasonCodeMapping: Record<string, string> | null;
}

export interface IWMSAdapter {
  vendor: WMSVendor;
  capabilities: WMSCapabilities;
  syncMode: SyncMode;

  testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
  fetchInventory(filter?: InventoryFilter): Promise<InventoryRow[]>;
  fetchLocations(): Promise<LocationNode[]>;
  pushInboundInstruction(batch: InboundBatch): Promise<{ ack: boolean; vendorRef?: string }>;
  requestAdjustment(req: AdjustmentRequest): Promise<{ status: 'applied' | 'pending_external'; vendorRef?: string }>;
  fetchHistory(range: DateRange): Promise<HistoryEvent[]>;
}
```

### B-3. Mock 어댑터 3종 구현
- `MockSelfWarehouseAdapter` — 우리 자체 창고 (가상, 모든 capability 지원)
- `MockCJLogisticsAdapter` — REST API + LOT 미지원 + 실시간
- `MockSFTPBatchAdapter` — SFTP 배치 + 일배치 동기화 + 위치 미지원

### B-4. 신규 페이지

#### B-4-1. `/admin/warehouses` (창고 연결 관리)
- 테이블: 창고코드, 이름, 벤더, 연결방식, 상태, 마지막 동기화, 동기화 주기, capabilities, actions
- 상세 드로어: 인증 정보, 필드 매핑, 동기화 로그, 정합성 diff
- 신규 추가 마법사 5단계: 벤더 선택 → 인증 → 매핑 추론 → 테스트 호출 → capability 감지/override

#### B-4-2. `/admin/warehouses/inventory` (WMS 재고 조회)
- 창고 카드 (연결 상태 점, freshness)
- 통합 재고 테이블 (capability에 따라 LOT/Location 컬럼 자동 표시/숨김)
- 강제 새로고침, 일배치 창고는 다음 동기화 시각 카운트다운

#### B-4-3. `/admin/warehouses/inbound` (입고예정)
- 창고 셀렉터 + vendor 뱃지
- WMS 전송 버튼 (벤더별 동작 다름은 어댑터 내부에서 처리)
- 전송 실패 시 에러 코드 + 재시도

#### B-4-4. `/admin/warehouses/adjustments` (재고조정)
- 같은 창고 내 이동 vs 창고 간 이동 (capability에 따라 차단)
- 외부 창고는 `pending_external` 상태 표기 + 평균 처리 시간 안내
- 사유코드 벤더별 매핑 미리보기

#### B-4-5. `/admin/warehouses/history` (이력)
- 출처 벤더 뱃지
- 동기화 이벤트 타입 (일치/불일치)
- 외부 발생 이벤트 별도 아이콘

#### B-4-6. `/admin/warehouses/locations` (로케이션)
- 창고가 declare한 schema 기반 동적 트리 렌더링
- 로케이션 미지원 창고는 안내 메시지

### B-5. 라우트 / FSD 배치
- `apps/server/src/adapters/wms/{Self,CJLogistics,SFTPBatch}Adapter.ts`
- `apps/server/src/services/WarehouseService.ts`
- `apps/server/src/routes/warehouses/index.ts`
- `apps/web/src/entities/warehouse/`
- `apps/web/src/pages/admin-warehouses/`
- `apps/web/src/widgets/warehouse-*` (필요 시)

---

## 4. UI 디자인 일관성

### 유지할 것 (PassOffer 톤)
- Chakra UI v3 컴포넌트 그대로 사용
- 회색 기반 + 액센트 색상 (기존 채널 페이지와 동일)
- 한글 라벨 우선
- 모든 mutating action은 confirm 모달
- Pretendard / system 폰트

### 새로 도입할 시각 언어
- **벤더 뱃지** — 약자 + 컬러 칩 (CJ=보라, 한진=청록, 롯데=빨강, 쿠팡=노랑, 자체=슬레이트)
- **연결 상태 점** — 녹색(연결) / 호박(지연) / 회색(미연결) / 빨강(에러), 옆에 마지막 동기화 시각
- **freshness 라벨** — fresh(녹), ok(회), stale(연한 회 + 배지)
- **capability 미지원 표시** — 컬럼/버튼 숨김 우선, 불가피하면 회색 + Lock 아이콘 + tooltip

---

## 5. 비요구사항 (하지 말 것)

- 실제 3PL 백엔드 연동 (mock adapter로만 시연)
- 인증/권한 체계 변경 (기존 JWT 그대로)
- 벤더 로고 사용 (저작권) — 텍스트 약자만
- 화면 컴포넌트 내부 벤더별 if/switch 분기
- Instrument Serif / 크림+러스트 톤 도입 (PassOffer 일관성 유지)
- 기존 채널 어댑터 메서드 시그니처를 breaking 변경 (capability/meta는 추가만)

---

## 6. 작업 순서 (Sonnet에게 단계적으로 지시)

각 단계는 별도 PR로 분리. 단계마다 타입 체크 + 빌드 통과 후 다음으로.

### Phase 0 — 설계 확정 (사람이 결정)
- [ ] Track A만 진행할지, A+B 둘 다 진행할지 결정
- [ ] WMS 도메인 도입 시 실제 3PL 후보 1~2개 선정 (mock 설계 정확도용)
- [ ] 마스터상품 ↔ 창고재고의 SKU 키 정합성 정책 결정

### Phase 1 — Track A: 채널 capability/meta 추가
1. `packages/types/src/index.ts`에 `ChannelCapabilities`, `SyncMeta`, `ConnectionStatus`, `Freshness`, `SyncMode` 타입 추가
2. `IChannelAdapter`에 `vendor`, `capabilities`, `syncMode`, `testConnection()` 추가
3. 4개 어댑터(Qoo10/Shopify/Shopee/Rakuten) 각각의 capability 선언 + testConnection 구현
4. 서버: `GET /api/channels/:id/health` 라우트 + `ChannelService.checkHealth()`
5. 웹: `useChannelHealth()` hook + 채널 카드에 연결 상태 점

### Phase 2 — Track A: 화면 일괄 적용
6. `shared/ui`에 `<VendorBadge>`, `<ConnectionStatusDot>`, `<FreshnessLabel>` 컴포넌트 추가
7. orders / products / inventory / master-products 페이지에 일괄 적용
8. capability 기반 조건부 렌더링 (미지원 액션 자동 숨김)

### Phase 3 — Track A: 채널 헬스 모니터 페이지
9. `/settings/channels/health` 페이지 신설
10. 사이드바 메뉴 추가, 라우팅 wiring

### Phase 4 — Track B: WMS DB 스키마 + 어댑터 인터페이스
11. drizzle migration: warehouses / warehouse_locations / warehouse_stocks / inbound_orders / stock_movements
12. `packages/types`에 WMS 타입 + `IWMSAdapter` 추가
13. Mock 어댑터 3종 구현 (Self / CJ / SFTPBatch)
14. `WarehouseService` + 라우트 작성

### Phase 5 — Track B: 창고 연결 관리 페이지
15. `entities/warehouse` (queries/mutations/types)
16. `pages/admin-warehouses/ConnectionsPage` (테이블 + 드로어)
17. 신규 추가 마법사 (5단계 stepper)

### Phase 6 — Track B: WMS 운영 화면들
18. inventory / inbound / adjustments / history / locations 페이지 차례로
19. 각 페이지가 capability에 따라 자동 다른 렌더링 시연
20. 자체 + 외부 창고 동시 표시 시 시각 정렬 검증

### Phase 7 — 통합 검증
21. e2e: 새 창고 추가 → 모든 화면 셀렉터 즉시 반영
22. capability 토글 시 화면 자동 갱신
23. mock 응답 지연 / 실패 시 freshness/에러 시각화 점검

---

## 7. Sonnet에게 던질 단계별 프롬프트 (각 Phase별)

### Phase 1 프롬프트 예시
```
Track A의 Phase 1을 진행한다.

목표: IChannelAdapter에 capability/meta 추상화를 추가하고, 기존 4개 어댑터(Qoo10/Shopify/Shopee/Rakuten)에 적용한다.

1. packages/types/src/index.ts 수정
   - 369번째 줄 IChannelAdapter 위에 ChannelCapabilities, SyncMeta, ConnectionStatus, SyncMode, Freshness 타입 추가
   - IChannelAdapter에 vendor, capabilities, syncMode, testConnection() 추가 (기존 옵셔널 메서드는 유지)

2. 각 어댑터에서:
   - Qoo10Adapter: vendor='QOO10_JP', 모든 capability true (실시간 재고 + 주문/상품/재고 모두 지원)
   - ShopifyAdapter: vendor='SHOPIFY', 모든 capability true
   - ShopeeAdapter: vendor='SHOPEE', 주문/상품 일부만 true (stub인 부분은 false)
   - RakutenAdapter: vendor='RAKUTEN', 대부분 false (stub)
   - 각각 testConnection() 구현 (validateCredential을 감싸서 latency 측정)

3. ChannelService에 checkHealth(channelId) 추가
   - 어댑터를 만들어 testConnection() 호출
   - 결과 + 마지막 동기화 시각 반환

4. 라우트: GET /api/channels/:id/health (apps/server/src/routes/channels/index.ts)

5. 웹: entities/channel/api에 useChannelHealth() 추가

작업 후 양쪽 tsc 통과 확인.
```

### Phase 2~7 프롬프트는 각 Phase 진입 시점에 별도 작성.

---

## 8. 의사결정 필요 항목 (사용자 확정 후 시작)

1. **범위:** Track A만? A+B 모두? B만?
2. **WMS 우선순위:** 자체 창고 우선 vs 3PL 우선?
3. **마스터상품 SKU 정합성:** 우리 SKU = 벤더 SKU 강제? 매핑 테이블로 흡수?
4. **Phase별 PR 사이즈:** Phase 단위로 1 PR씩? 아니면 더 잘게?
5. **mock 데이터 시나리오:** 제공되는 더미 데이터 규모(상품 N개, 창고 M개)?

위 항목 답변 받은 후 Phase 1부터 순차 시작.
