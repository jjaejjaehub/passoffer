# Order Field Source — 주문 필드 출처 규칙 (A 문서)

> StandardOrder의 각 필드가 **어디서 와서 / 누가 덮어쓸 수 있는지**를 단일 메타맵으로 관리한다.
> 코드의 `applySyncUpdate`, `isEditableByUser`, `recomputeMasterFields`는 모두 이 메타맵을 읽어 동작한다.
> 신규 필드가 들어올 때 분기 코드를 새로 짜지 말고, 메타맵 한 줄만 추가한다.

## 1. FieldSource 4종

```ts
type FieldSource =
  | 'api'        // 수동 동기화 시 채널 API에서 그대로 받아오는 값
  | 'api_sync'   // 채널과 양방향 동기화 (Rule Engine 적용)
  | 'system'     // OMS 내부에서 생성/관리하는 값
  | 'master';    // SKU 마스터에서 파생되는 값
```

| source | sync 덮어쓰기 | 사용자 편집 | 채널로 push | 설명 |
|---|---|---|---|---|
| `api` | **첫 수집 시 1회만 채움** (이후 보존) | ❌ | ❌ | 주문 시점 스냅샷 — 수령자, 주소, 결제수단 등 |
| `api_sync` | **항상 (rank 규칙 적용)** | ❌ | ✅ (양방향) | fulfillment_status, 송장번호, 발송예정일 등 |
| `system` | ❌ | ✅ | ❌ | OMS가 만들고 OMS만 바꿀 수 있는 값 |
| `master` | ❌ | ❌ (재계산만) | ❌ | SKU 마스터 변경 시 재산출 — skuCode, appliedGifts |

> `api`의 "첫 수집 시 1회만" 동작은 **별도 source가 아니라 `api` 내부 분기**로 처리한다 (Q3-1 결정 b).
> `applySyncUpdate` 내부에서 `existing[field] == null` 일 때만 채우고, 그 외엔 무시한다.

## 2. ORDER_FIELD_SOURCE 메타맵

`apps/server/src/services/orders/fieldSource.ts` (예정 위치):

```ts
import type { StandardOrder } from '@oms/types';

export type FieldSource = 'api' | 'api_sync' | 'system' | 'master';

export const ORDER_FIELD_SOURCE = {
  // === api: 첫 수집 시만 채움, 이후 보존 ===
  orderName:          'api',
  orderedAt:          'api',
  paidAt:             'api',
  channelOrderId:     'api',
  channelAccountId:   'api',
  receiverName:       'api',
  receiverMobile:     'api',
  receiverTel:        'api',
  receiverEmail:      'api',
  zipCode:            'api',
  address1:           'api',
  address2:           'api',
  shippingMessage:    'api',
  paymentMethod:      'api',
  currency:           'api',
  orderPrice:         'api',
  orderQty:           'api',
  discount:           'api',
  total:              'api',
  shippingRate:       'api',
  // 라인아이템 원본
  channelItemCode:    'api',
  channelItemTitle:   'api',
  channelOption:      'api',
  channelOptionCode:  'api',

  // === api_sync: 매 동기화마다 rank 비교 후 덮어씀 ===
  fulfillmentStatus:  'api_sync',   // rank 전진만, 90(판매완료) 불가침
  shippingDueDate:    'api_sync',   // Qoo10 EstShipDt 양방향
  trackingCarrier:    'api_sync',   // fill-if-empty (다르면 충돌 플래그)
  trackingNo:         'api_sync',   // fill-if-empty
  shippedAt:          'api_sync',
  deliveredAt:        'api_sync',
  claimStatus:        'api_sync',
  claimType:          'api_sync',
  claimReason:        'api_sync',

  // === system: OMS 내부 생성, 사용자만 편집 ===
  status:             'system',     // 13단계 한글 라벨 (derived from fulfillment+claim, but stored)
  bundleNumber:       'system',     // 합포장 묶음 ID
  bundleable:         'system',     // SKU bundleable로 초기화 후 사용자 오버라이드 가능
  internalNote:       'system',     // 내부 메모
  dispatchHoldReason: 'system',     // 출고보류 사유
  autoMatched:        'system',     // 자동매칭 성공 여부
  matchedAt:          'system',
  matchedBy:          'system',     // 'auto' | 'manual' | 'rule'

  // === master: SKU 마스터 기준 재계산 ===
  skuId:              'master',
  skuCode:            'master',
  skuName:            'master',
  outputQty:          'master',     // 매칭규칙의 outputQty * orderQty
  appliedGifts:       'master',     // 사은품 규칙 적용 결과
} as const satisfies Record<keyof StandardOrder, FieldSource>;
```

`satisfies` 덕분에 **StandardOrder에 새 필드를 추가하면 메타맵에 빠진 키가 컴파일 에러로 즉시 드러난다.**

## 3. 권한 매트릭스 — 누가 무엇을 바꿀 수 있나

| 동작 / source | `api` | `api_sync` | `system` | `master` |
|---|---|---|---|---|
| 수동 동기화 (Pull) | 빈 값에 한해 채움 | rank 규칙 적용 후 덮어씀 | 무시 | 무시 |
| 사용자 편집 (PATCH) | 거부 (409) | 거부 (409) | 허용 | 거부 (409) |
| 채널 Push (status·송장) | N/A | 출처 channel만 dirty bit 검사 후 push | N/A | N/A |
| SKU 마스터 재계산 | 무시 | 무시 | 무시 | 재산출 |
| 합포장 묶기/풀기 | 무시 | 무시 | bundleNumber/bundleable 변경 | 무시 |

> `api_sync` 필드 중 `trackingNo` 등 일부는 "fill-if-empty + 충돌 플래그" 정책을 따른다 (§5 참조).

## 4. 의사코드

### 4.1 `applySyncUpdate(existing, incoming)`

```ts
function applySyncUpdate(existing: OrderRow, incoming: Partial<OrderRow>) {
  const patch: Partial<OrderRow> = {};

  for (const key of Object.keys(incoming) as Array<keyof OrderRow>) {
    const source = ORDER_FIELD_SOURCE[key];
    const next = incoming[key];

    switch (source) {
      case 'api':
        // 첫 수집 시 1회만 — 이미 있으면 보존
        if (existing[key] == null && next != null) patch[key] = next;
        break;

      case 'api_sync':
        // Rule Engine + rank 비교
        if (key === 'fulfillmentStatus') {
          if (rankOf(next) >= rankOf(existing.fulfillmentStatus)
              && existing.fulfillmentStatus !== 90 /* 판매완료 불가침 */) {
            patch[key] = next;
          }
        } else if (key === 'trackingNo' || key === 'trackingCarrier') {
          // fill-if-empty
          if (existing[key] == null) patch[key] = next;
          else if (existing[key] !== next) flagConflict(existing.id, key, next);
        } else {
          patch[key] = next; // 단순 덮어쓰기
        }
        break;

      case 'system':
      case 'master':
        // 동기화 페이로드에 섞여 와도 무시
        break;
    }
  }
  return patch;
}
```

### 4.2 `isEditableByUser(field)`

```ts
export function isEditableByUser(field: keyof StandardOrder): boolean {
  return ORDER_FIELD_SOURCE[field] === 'system';
}

// PATCH /api/orders/:id 핸들러
for (const [key, value] of Object.entries(body)) {
  if (!isEditableByUser(key as keyof StandardOrder)) {
    return reply.code(409).send({ error: `${key} is not user-editable (source=${ORDER_FIELD_SOURCE[key]})` });
  }
}
```

### 4.3 `recomputeMasterFields(order, skuMaster, matchRule, giftRules)`

```ts
export function recomputeMasterFields(order: OrderRow, ctx: MasterCtx): Partial<OrderRow> {
  // master source 필드만 다시 계산
  const sku = ctx.skuMaster[order.skuId];
  return {
    skuCode:      sku?.code ?? null,
    skuName:      sku?.name ?? null,
    outputQty:    (ctx.matchRule?.outputQty ?? 1) * order.orderQty,
    appliedGifts: evaluateGiftRules(order, ctx.giftRules),
  };
}
```

SKU 마스터 변경 시 영향 받는 주문만 골라 이 함수만 다시 돌리면 충분 — `api`/`api_sync`/`system` 값은 건드리지 않는다.

## 5. 충돌(Conflict) 모델

`api_sync` 필드 중 fill-if-empty 정책을 쓰는 필드(`trackingNo`, `trackingCarrier`)는 다음 케이스에 충돌 플래그를 세운다:

| 시나리오 | 동작 |
|---|---|
| OMS=null, 채널=값 | 채움 |
| OMS=값, 채널=null | 보존 |
| OMS=A, 채널=A | no-op |
| OMS=A, 채널=B (A≠B) | **보존 + `tracking_conflict` 플래그** + 사용자 해소 워크플로우 큐 등록 |

해소 워크플로우 UI는 별도 페이지로 분리 (TBD — Q-tracking-conflict 후속).

## 6. 신규 필드 추가 워크플로우

1. `packages/types/src/order.ts`의 `StandardOrder`에 새 필드를 추가한다.
2. **컴파일 에러가 나는 그 자리에서** `ORDER_FIELD_SOURCE`에 source를 지정한다.
3. source가 `api` 또는 `api_sync`라면 채널별 `IOrderAdapter.toStandard()`의 매핑 표(예: `docs/api/qoo10/orders/CONVERT_RULES.md`)에 그 필드를 추가한다.
4. source가 `master`라면 `recomputeMasterFields` 분기에 한 줄 추가한다.
5. source가 `system`이라면 사용자 편집 UI(주문 상세 PATCH 폼)에 입력 컴포넌트 추가.
6. DB 마이그레이션 생성 후 `bun run db:generate`.

> source 결정이 애매하면 다음 순서로 판단: **사용자가 수동으로 고치고 싶나? → `system`.**
> **마스터 바뀌면 같이 바뀌어야 하나? → `master`.**
> **채널과 양방향이 필요하나? → `api_sync`.**
> **나머지(주문 시점 스냅샷)는 `api`.**

## 7. 관련 문서

- 매칭규칙 / 자동매칭: `docs/order-management/match-rules.md` (TBD)
- 합포장 정책: `docs/order-management/bundling.md` (TBD)
- 상태 전이: `docs/order-management/state-machine.md` (TBD)
- Qoo10 필드 매핑: `docs/api/qoo10/orders/CONVERT_RULES.md` (TBD)
- 채널 capability 매트릭스: `apps/web/src/shared/config/channelCapabilities.ts` (TBD, Q8)

## 8. 미결 (다음 턴에 결정)

- §5 충돌 해소 UI 흐름 (운송장 conflict 페이지 vs 주문 상세 인라인)
- `status` 필드를 진짜 컬럼으로 저장할지 / DB는 fulfillment+claim 2축만 두고 표시 시점 derive할지
  - 현재 메타맵은 `system`으로 잡아뒀으나, 저장하지 않고 계산만 한다면 메타맵에서 제거 + `derived` source 신설 검토
