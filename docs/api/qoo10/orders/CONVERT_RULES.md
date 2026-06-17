# Qoo10 → StandardOrder Convert Rules

> 채널 응답을 OMS [[standard-order-v2]] 로 변환하는 결정론적 룩업표.
> **LLM 호출 금지.** 본 표에 없는 필드는 빈값/`null` 처리하고 [[decisions]] §G 에 등록.
> 어댑터 위치: `apps/server/src/adapters/qoo10/QOO10OrderAdapter.ts` (`toStandard(payload)`).

## 0. 메타

| 항목 | 값 |
|---|---|
| 채널 ID | `qoo10` |
| 플랫폼 키 | `QOO10_JP` |
| API 호스트 | `api.qoo10.jp` (www.qoo10.jp 는 404, [[feedback_qoo10_api_rule]]) |
| 인증 방식 | QSM Cert-Key (AES-256-GCM 암호화 저장, `ChannelService.decrypt`) |
| 인입 엔드포인트 | `ShoppingDetail.GetShippingInfo_v3` (일반 판매자), `ShoppingDetail.GetOrderInfo`, `ShoppingDetail.GetClaimList` |
| 양방향 엔드포인트 | `ShoppingDetail.SetSellerCheckYN_V2`, `ShoppingDetail.SetSellerCheckYNBulk`, `ShoppingDetail.SetShippingInfo_v2` |
| 미수록 | `Logistics.GetShippingInfo_Logistics` (한국 물류사 전용, 일반 판매자 대상 외) |

## 1. 인입 핸들러 매트릭스

| StandardOrder 필드군 | 인입 함수 | Qoo10 엔드포인트 | 빈도 |
|---|---|---|---|
| Identity / Buyer / Receiver / Sender / Payment / Fulfillment 초기 | `pullOrders(sinceDate)` | `GetShippingInfo_v3` | 분 단위 폴링 |
| 확장(주소 분리, 결제 상세) | `pullOrderDetail(orderNo)` | `GetOrderInfo` | on-demand |
| Claim | `pullClaims(sinceDate)` | `GetClaimList` | 분 단위 폴링 |
| 배송 push | `pushTracking(order)` | `SetShippingInfo_v2` | 사용자 액션 |
| 발송예정일 push | `pushDispatchDelay(orderNos[], delayType)` | `SetSellerCheckYNBulk` | 사용자 액션 |

## 2. 매핑표 — GetShippingInfo_v3 → StandardOrder

> 출처: `docs/api/qoo10/logistics/GetShippingInfo_Logistics.md` ResultObject 51필드 (구조 동일).
> 일반 판매자는 `ShippingBasic.GetShippingInfo_v3` 응답 형태로 받지만 키 명세는 같음 (Qoo10 공통 규약, [[conventions]]).

| Qoo10 키 | StandardOrder 필드 | 변환 | 비고 |
|---|---|---|---|
| `OrderNo` | `channelOrderId` | 그대로 | string |
| `PackNo` | `channelPackNo` | 그대로 | nullable |
| `ItemNo` | `channelItemNo` | 그대로 | — |
| `SellerID` | `channelAccountId` | 그대로 | — |
| `RelatedOrder` | `relatedOrders` | `value.split(',').filter(Boolean)` | "" → `[]` |
| `Buyer` | `buyerName` | trim | — |
| `BuyerKana` | `buyerKana` | trim | nullable |
| `BuyerTel` | `buyerTel` | digits only | — |
| `BuyerMobile` | `buyerMobile` | digits only | — |
| `BuyerEmail` | `buyerEmail` | lowercase | — |
| `Receiver` | `receiverName` | trim | — |
| `ReceiverKana` | `receiverKana` | trim | nullable |
| `ReceiverTel` | `receiverTel` | digits only | — |
| `ReceiverMobile` | `receiverMobile` | digits only | — |
| `ZipCode` | `zipCode` | trim | — |
| `ShippingAddress` | `shippingAddress` | trim | — |
| `Address1` | `address1` | trim | — |
| `Address2` | `address2` | trim | — |
| `SenderName` | `senderName` | trim | — |
| `SenderTel` | `senderTel` | digits only | — |
| `SenderNation` | `senderNation` | ISO α-2 upper | "JP" |
| `SenderZipCode` | `senderZipCode` | trim | — |
| `SenderAddress` | `senderAddress` | trim | — |
| `OrderDate` | `orderedAt` | `parseQoo10Date` (JST → UTC) | — |
| `PaymentDate` | `paidAt` | `parseQoo10Date` | nullable |
| `PaymentMethod` | `paymentMethod` | 그대로 | — |
| `Currency` | `currency` | upper | default `JPY` |
| `OrderPrice` | `lineItems[0].unitPrice` & `orderPrice` | Number | line 단일 |
| `OrderQty` | `lineItems[0].orderQty` | Number | — |
| `Discount` | `discount` | Number | — |
| `CartDiscountSeller` | `cartDiscountSeller` | Number | — |
| `CartDiscountQoo10` | `cartDiscountChannel` | Number | — |
| `Total` | `total` & `lineItems[0].totalPrice` | Number | — |
| `ShippingRate` | `shippingRate` | Number | — |
| `ShippingRateType` | `shippingRateType` | enum normalize | `Free`/`Charge`/`Free on condition` |
| `ShippingWay` | `shippingWay` | 그대로 | — |
| `ShippingMessage` | `shippingMessage` | trim | — |
| `EstimatedShippingDate` | `shippingDueDate` | `parseQoo10Date` | api_sync, 양방향 |
| `ShippingDate` | `shippedAt` | `parseQoo10Date` | nullable |
| `DeliveredDate` | `deliveredAt` | `parseQoo10Date` | nullable |
| `DesiredDeliveryDate` | `desiredDeliveryDate` | `parseQoo10Date` | nullable |
| `DeliveryCompany` | `trackingCarrier` | trim | fill-if-empty |
| `TrackingNo` | `trackingNo` | trim | fill-if-empty + 충돌검사 |
| `SellerItemCode` | `lineItems[0].channelItemCode` | 그대로 | — |
| `ItemTitle` | `lineItems[0].channelItemTitle` | 그대로 | — |
| `Option` | `lineItems[0].channelOption` | 그대로 | — |
| `OptionCode` | `lineItems[0].channelOptionCode` | 그대로 | — |
| `ShippingStatus` | `fulfillmentStatus` (StatusRuleEngine) | §4 매핑 | — |

> Qoo10 GetShippingInfo_v3 응답은 주문 1건 = 라인 1개 → `lineItems` 배열 길이 1.

## 3. fill-if-empty + 충돌 정책 (운송장)

```
if (!order.trackingNo) {
  order.trackingNo = payload.TrackingNo
  order.trackingCarrier = payload.DeliveryCompany
} else if (order.trackingNo !== payload.TrackingNo) {
  order.trackingConflict = true          // [[decisions]] A-5
  order.trackingConflictPayload = payload // 사용자 해소 대기
}
```

해소 워크플로우: [[decisions]] G-Q3 미결.

## 4. ShippingStatus → fulfillmentStatus rank

`StatusRuleEngine.qoo10.toFulfillment(shippingStatus)` — 결정론적 표:

| Qoo10 `ShippingStatus` | rank | 비고 |
|---|---|---|
| 정상 / 일반 (배송준비 전) | `30` 출고대기 | [[decisions]] C-1 |
| 발송예정일 설정됨 | `30` 출고대기 | EstimatedShippingDate 존재 |
| 송장입력 완료 (미발송) | `40` 운송장출력 | TrackingNo 채워짐 + ShippingDate 없음 |
| 발송완료 | `50` 출고완료 | ShippingDate 존재 |
| 배송중 | `60` 배송중 | — |
| 배송완료 | `70` 배송완료 | DeliveredDate 존재 |
| 구매결정 (Qoo10 미직접 제공) | — | [[decisions]] G-Q2 미결 |

> Qoo10 응답에 명시적 enum 컬럼이 없는 케이스는 `ShippingDate`/`DeliveredDate`/`TrackingNo`/`EstimatedShippingDate` 의 조합으로 파생.
> 전진만(rank 단조증가). 역전 입력은 무시 + log warn.

## 5. Claim 매핑 (GetClaimList)

| Qoo10 키 | StandardOrder 필드 | 비고 |
|---|---|---|
| `OrderNo` | (join key) | claims.order_no |
| `ClaimType` enum | `claimType` | `Cancel`→`cancel`, `Return`→`return`, `Exchange`→`exchange`, `Swap`→`swap` |
| `ClaimStatus` | `claimStatus` | [[decisions]] C-2 enum 매핑 |
| `RequestDate` | `claimRequestedAt` | — |
| `CompleteDate` | `claimResolvedAt` | — |
| `Reason` | `claimReason` | — |
| `ReturnTrackingNo` | `returnTrackingNo` | — |
| `ReturnDeliveryCompany` | `claims.delivery_company_return` | — |

`Receiver`/`ReceiverMobile` 등 클레임 응답에도 포함되지만 본 주문 레코드를 신뢰원으로 두고 claims 테이블에만 mirror 저장.

## 6. 양방향 push 룰

### 6-1 발송예정일 `SetSellerCheckYN_V2` / `SetSellerCheckYNBulk`

| 입력 | 검증 |
|---|---|
| `orderNo[]` | `<=` 100건 (Bulk 한정, [[conventions]]) |
| `DelayType` | `1`/`2`/`3`/`4` (PDF §4-1 매핑 — 본 PDF는 PLAYAUTO 측 코드, Qoo10 측은 §INDEX 재확인 필요) |
| `EstimatedShippingDate` | YYYY-MM-DD JST, 오늘+1 ~ 오늘+30 |

성공 시 `shippingDueDate` 즉시 동기화 + `fulfillment_status` 변화 없음.

### 6-2 운송장 `SetShippingInfo_v2`

| 입력 | 매핑원 |
|---|---|
| `OrderNo` | StandardOrder.channelOrderId |
| `DeliveryCompany` | trackingCarrier (Qoo10 코드 매핑표 별도) |
| `TrackingNo` | trackingNo |

성공 시 `fulfillmentStatus = 40 (운송장출력)`. 채널 푸시는 묶음번호 미전송 ([[decisions]] G-Q5 결정 대기).

## 7. fallback 정책

- 빈 문자열 (`""`) → `null` 로 정규화. 단 `address2`, `shippingMessage` 등 사용자 입력은 빈 문자열 유지.
- `0` 숫자는 그대로 (할인/배송비 0 케이스).
- 알 수 없는 `ShippingStatus` 문자열 → rank 유지 + `audit.unknownShippingStatus` 로그.
- `parseQoo10Date` 실패 시 `null` + `audit.dateParseFailed` 로그. raw 는 `rawData` 에 보존.

## 8. 작업 시 주의사항 (누적)

- API 호스트는 **반드시 `api.qoo10.jp`**. `www.qoo10.jp` 는 404.
- `Logistics.GetShippingInfo_Logistics` 는 한국 물류사 (m_no 15776) 전용 — 일본 일반 판매자에게 호출 금지. 응답 키 구조는 동일하므로 매핑표는 v3 와 공유 가능.
- `RelatedOrder` 가 채워진 주문은 묶음 후보 → [[decisions]] A-4 bundleNumber 후처리에서 활용. Qoo10 측 묶음 식별자는 별도 컬럼이 없고 `PackNo`/`RelatedOrder` 조합.
- Qoo10 응답의 날짜 문자열은 JST 기준. UTC 변환 시 `+09:00` 명시.
- `OptionCode` 가 채널 옵션 SKU 키 → match_rules `channel_id+channel_item_code+option_code` 우선, fallback `channel_id+channel_item_code+option_name` ([[decisions]] A-10).
- 본 표에 없는 신규 필드 발견 시 → 본 문서에 한 줄 추가 후 [[standard-order-v2]] 컬럼 증설 PR.

## 9. TODO

- DeliveryCompany 코드 ↔ OMS carrierId 매핑표 (별도 `docs/api/qoo10/orders/carriers.md`).
- DelayType 1~4 의미 PDF/Qoo10 양측 재확인 후 enum 고정.
- GetOrderInfo 응답 키 차이 (Address1/Address2 분리 보정용) 별도 표.
- 묶음번호 push 가능 여부 ([[decisions]] G-Q6 supportsBundleNumberInPush 확정 후 §6-2 갱신).
