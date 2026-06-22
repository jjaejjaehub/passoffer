# StandardOrder v2 — Canonical Data Model 62컬럼 명세

> 본 문서는 OMS의 채널 독립 주문 표준 스키마 v2.
> [[field-source]] 의 `ORDER_FIELD_SOURCE` 메타맵과 1:1 매칭되며,
> 신규 채널 어댑터는 `toStandard(channelPayload): StandardOrder` 를 본 표 기준으로 구현한다.
> 인용: PLAYAUTO PDF (§표기) / `docs/api/qoo10/*.md` / [[decisions]] / [[field-source]].

## 0. 분류 요약

| 분류 | 컬럼 수 | source | DB 테이블 |
|---|---|---|---|
| Identity (식별·관계) | 8 | system / api | `orders` |
| Buyer (구매자) | 6 | api | `orders` |
| Receiver (수취인·배송지) | 11 | api | `orders` |
| Sender (발송지) | 5 | api / system | `orders` |
| Payment (결제·정산) | 9 | api | `orders` |
| Fulfillment (배송·발송) | 9 | api_sync | `orders` |
| Status (상태·전이) | 5 | api_sync / system | `orders` |
| Claim (클레임) | 5 | api_sync | `claims` (FK) |
| Bundle (묶음/합포장) | 3 | system | `orders` |
| Master (SKU 파생) | 6 | master | `orders` + `order_items` |
| Audit (감사) | 5 | system | `orders` + `order_status_history` |
| **합계** | **72** | — | — |

> 초기 가설 "62컬럼"은 buyer/receiver/sender 통합 + audit 미포함 기준 수치였음.
> 본 문서는 정합성 우선으로 **72컬럼 완전 매핑**으로 확장. [[decisions]] B의 ORDER_FIELD_SOURCE 메타맵은 본 표 기준으로 갱신 필요.

---

## 1. Identity (8) — `orders` 식별/관계

| # | 컬럼 | 타입 | source | nullable | 설명 |
|---|---|---|---|---|---|
| 1 | `id` | uuid | system | no | OMS 내부 PK |
| 2 | `userId` | uuid | system | no | 소유자 (users FK) |
| 3 | `channelId` | uuid | system | no | channels FK |
| 4 | `channelOrderId` | text | api | no | 채널 고유 주문 ID (Qoo10 `OrderNo`) |
| 5 | `channelPackNo` | text | api | yes | Qoo10 `PackNo` (장바구니 번호) |
| 6 | `channelAccountId` | text | api | yes | 채널 셀러 ID (Qoo10 `SellerID`) |
| 7 | `channelItemNo` | text | api | yes | Qoo10 `ItemNo` (채널 상품 번호) — 라인 단일주문일 때만 |
| 8 | `relatedOrders` | jsonb | api | yes | Qoo10 `RelatedOrder` 콤마분리 → 배열 |

## 2. Buyer (6) — 구매자

| # | 컬럼 | 타입 | source | nullable | 인용 |
|---|---|---|---|---|---|
| 9 | `buyerName` | text | api | yes | Qoo10 `Buyer` |
| 10 | `buyerKana` | text | api | yes | Qoo10 `BuyerKana` (일본 채널 전용) |
| 11 | `buyerTel` | text | api | yes | Qoo10 `BuyerTel` |
| 12 | `buyerMobile` | text | api | yes | Qoo10 `BuyerMobile` |
| 13 | `buyerEmail` | text | api | yes | Qoo10 `BuyerEmail` |
| 14 | `buyerLanguage` | varchar(8) | api | yes | 채널 buyer locale (Shopify `locale`) — Qoo10 미제공 |

## 3. Receiver / 배송지 (11)

| # | 컬럼 | 타입 | source | nullable | 인용 |
|---|---|---|---|---|---|
| 15 | `receiverName` | text | api | yes | Qoo10 `Receiver` |
| 16 | `receiverKana` | text | api | yes | Qoo10 `ReceiverKana` |
| 17 | `receiverTel` | text | api | yes | Qoo10 `ReceiverTel` |
| 18 | `receiverMobile` | text | api | yes | Qoo10 `ReceiverMobile` |
| 19 | `receiverEmail` | text | api | yes | (채널별 가변, Qoo10 미제공) |
| 20 | `zipCode` | text | api | yes | Qoo10 `ZipCode` |
| 21 | `shippingAddress` | text | api | yes | Qoo10 `ShippingAddress` (전체 주소) |
| 22 | `address1` | text | api | yes | Qoo10 `Address1` |
| 23 | `address2` | text | api | yes | Qoo10 `Address2` |
| 24 | `country` | varchar(2) | api | yes | ISO 3166-1 alpha-2 (Qoo10 일본 = "JP") |
| 25 | `desiredDeliveryDate` | timestamp | api | yes | Qoo10 `DesiredDeliveryDate` |

## 4. Sender / 발송지 (5)

| # | 컬럼 | 타입 | source | nullable | 인용 |
|---|---|---|---|---|---|
| 26 | `senderName` | text | api | yes | Qoo10 `SenderName` |
| 27 | `senderTel` | text | api | yes | Qoo10 `SenderTel` |
| 28 | `senderNation` | varchar(2) | api | yes | Qoo10 `SenderNation` |
| 29 | `senderZipCode` | text | api | yes | Qoo10 `SenderZipCode` |
| 30 | `senderAddress` | text | api | yes | Qoo10 `SenderAddress` |

## 5. Payment (9)

| # | 컬럼 | 타입 | source | nullable | 인용 |
|---|---|---|---|---|---|
| 31 | `orderedAt` | timestamp | api | no | Qoo10 `OrderDate` |
| 32 | `paidAt` | timestamp | api | yes | Qoo10 `PaymentDate` |
| 33 | `paymentMethod` | text | api | yes | Qoo10 `PaymentMethod` |
| 34 | `currency` | varchar(8) | api | no | Qoo10 `Currency` (default JPY) |
| 35 | `orderPrice` | numeric(12,2) | api | yes | Qoo10 `OrderPrice` 상품가 |
| 36 | `discount` | numeric(12,2) | api | yes | Qoo10 `Discount` 상품할인 |
| 37 | `cartDiscountSeller` | numeric(12,2) | api | yes | Qoo10 `CartDiscountSeller` |
| 38 | `cartDiscountChannel` | numeric(12,2) | api | yes | Qoo10 `CartDiscountQoo10` |
| 39 | `total` | numeric(12,2) | api | yes | Qoo10 `Total` (실주문금액) |

## 6. Fulfillment / 배송·발송 (9)

| # | 컬럼 | 타입 | source | nullable | 인용 |
|---|---|---|---|---|---|
| 40 | `shippingWay` | text | api | yes | Qoo10 `ShippingWay` |
| 41 | `shippingMessage` | text | api | yes | Qoo10 `ShippingMessage` |
| 42 | `shippingRate` | numeric(12,2) | api | yes | Qoo10 `ShippingRate` |
| 43 | `shippingRateType` | varchar(32) | api | yes | Qoo10 `ShippingRateType` (`Free`/`Charge`/`Free on condition`) |
| 44 | `shippingDueDate` | timestamp | api_sync | yes | Qoo10 `EstimatedShippingDate` (양방향, `SetSellerCheckYN_V2`) |
| 45 | `shippedAt` | timestamp | api_sync | yes | Qoo10 `ShippingDate` |
| 46 | `deliveredAt` | timestamp | api_sync | yes | Qoo10 `DeliveredDate` |
| 47 | `trackingCarrier` | text | api_sync | yes | Qoo10 `DeliveryCompany` — fill-if-empty |
| 48 | `trackingNo` | text | api_sync | yes | Qoo10 `TrackingNo` — fill-if-empty + 충돌 플래그 |

## 7. Status / 상태·전이 (5)

| # | 컬럼 | 타입 | source | nullable | 비고 |
|---|---|---|---|---|---|
| 49 | `fulfillmentStatus` | smallint | api_sync | no | rank 10~90 ([[decisions]] C-1). 전진만, 90 불가침. |
| 50 | `claimStatus` | varchar(32) | api_sync | yes | [[decisions]] C-2 enum. 미수취 추가 여부는 G-Q1 미결. |
| 51 | `displayStatus` | varchar(32) | system | no | UI enum (2축 derived but stored — 미결 사항, [[field-source]] §8 참조). |
| 52 | `isDispatchDelayed` | boolean | system | no | PDF §4-1 출고지연 라벨. 기본 false. |
| 53 | `dispatchHoldReason` | text | system | yes | "출고보류" 사유 (사용자 입력). |

## 8. Claim (5) — 본 테이블에 요약만, 상세는 `claims` 테이블

| # | 컬럼 | 타입 | source | nullable | 비고 |
|---|---|---|---|---|---|
| 54 | `claimType` | varchar(16) | api_sync | yes | `cancel` / `return` / `exchange` / `swap` |
| 55 | `claimReason` | text | api_sync | yes | 채널 제공 사유 |
| 56 | `claimRequestedAt` | timestamp | api_sync | yes | claim request_date |
| 57 | `claimResolvedAt` | timestamp | api_sync | yes | cancel_refund_date 등 |
| 58 | `returnTrackingNo` | text | api_sync | yes | `claims.tracking_no_return` 미러 |

## 9. Bundle / 묶음 (3)

| # | 컬럼 | 타입 | source | nullable | 비고 |
|---|---|---|---|---|---|
| 59 | `bundleNumber` | varchar(64) | system | yes | [[decisions]] A-4. 별도 테이블 없이 공유 컬럼. |
| 60 | `bundleable` | boolean | system | no | SKU.`isBundlable` 초기 복사 후 사용자 오버라이드 가능. |
| 61 | `bundleRoleIsPrimary` | boolean | system | no | PDF §6-1 "기준 주문 1개" — 묶음 내 단일 true. |

## 10. Master / SKU 파생 (6) — `order_items` 라인 단위로 정규화

| # | 컬럼 | 타입 | source | nullable | 비고 |
|---|---|---|---|---|---|
| 62 | `skuId` | uuid | master | yes | skus FK. 매칭 실패 시 null. |
| 63 | `skuCode` | varchar(128) | master | yes | skus.code 미러 |
| 64 | `skuName` | varchar(255) | master | yes | skus.name 미러 |
| 65 | `outputQty` | integer | master | yes | match_rule.outputQty * orderQty ([[decisions]] A-10) |
| 66 | `appliedGifts` | jsonb | master | yes | gift_rules 평가 결과 ([[decisions]] A-8) |
| 67 | `warehouseId` | uuid | master | yes | match_rules 후 default_warehouse_id |

## 11. Audit (5)

| # | 컬럼 | 타입 | source | nullable | 비고 |
|---|---|---|---|---|---|
| 68 | `rawData` | jsonb | api | yes | 채널 원본 페이로드 (디버그·재처리용) |
| 69 | `autoMatched` | boolean | system | no | match_rules 자동 성공 여부 ([[decisions]] A-10) |
| 70 | `matchedBy` | varchar(16) | system | yes | `auto` / `manual` / `rule` |
| 71 | `createdAt` | timestamp | system | no | OMS 수집 시각 |
| 72 | `updatedAt` | timestamp | system | no | 최종 갱신 시각 |

`order_status_history` (분리 테이블):
- `id`, `orderId`, `from_fulfillment`, `to_fulfillment`, `from_claim`, `to_claim`, `actor`(`channel`/`user`/`system`), `actorId`, `reason`, `createdAt`.

---

## 12. order_items 라인 단위 컬럼 (참고)

| 컬럼 | source | 비고 |
|---|---|---|
| `id` / `orderId` | system | — |
| `lineNo` | system | 정렬 안정성 |
| `channelItemCode` | api | Qoo10 `SellerItemCode` |
| `channelItemTitle` | api | Qoo10 `ItemTitle` |
| `channelOption` | api | Qoo10 `Option` |
| `channelOptionCode` | api | Qoo10 `OptionCode` |
| `orderQty` | api | Qoo10 `OrderQty` |
| `unitPrice` | api | Qoo10 `OrderPrice` |
| `totalPrice` | api | Qoo10 `Total` |
| `skuId` / `skuCode` / `skuName` / `outputQty` / `warehouseId` | master | match_rule 결과 |
| `appliedGifts` | master | line 단위 — 주문 단위와 중복 가능 |

> Qoo10 GetShippingInfo_v3 응답은 **주문 1건 = line 1개** 구조 (위 `GetShippingInfo_Logistics.md` 확인).
> Shopify / Shopee 등은 1주문 N라인 → `order_items` 다중 row.

---

## 13. 미결 (Open)

| ID | 항목 | 참조 |
|---|---|---|
| O-1 | 미수취 클레임 카테고리 추가 | [[decisions]] G-Q1 |
| O-2 | displayStatus 저장 vs derived | [[field-source]] §8 |
| O-3 | tracking_conflict 해소 워크플로우 | [[decisions]] G-Q3 |
| O-4 | 강제분할 시 채널 push 정책 | [[decisions]] G-Q5 |
| O-5 | channel_capabilities 항목 확정 | [[decisions]] G-Q6 |

## 14. 다음 작업

- `apps/server/src/db/schema.ts` `orders` 테이블 본 표 72컬럼으로 마이그레이션 (drizzle generate).
- `apps/server/src/services/orders/fieldSource.ts` 신설, 본 표 source 컬럼을 `satisfies Record<keyof StandardOrder, FieldSource>` 로 컴파일 가드.
- `packages/types/src/order.ts` `StandardOrder` 타입 본 표 기준 재작성.
- 채널별 `toStandard` 매핑은 [[qoo10-convert-rules]] 부터 채워나간다.
