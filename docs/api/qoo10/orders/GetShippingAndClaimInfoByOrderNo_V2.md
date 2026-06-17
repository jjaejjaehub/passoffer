# GetShippingAndClaimInfoByOrderNo_V2 — 배송/클레임 조회API - 단일건의 배송/클레임 정보조회 (미수취 건 추가, 미수취환불건을 미수취로 조회)

## 메타

- **메서드명**: `GetShippingAndClaimInfoByOrderNo_V2`
- **서비스**: `ShippingBasic` (배송/취소 정보 조회)
- **클래스**: `ShippingBasic` (`GMKT.INC.Front.QAPIBiz.Shipping.ShippingBasic`)
- **m_no / c_no**: 15477 / 10013
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/15477_info.json`, `_raw/15477_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

판매자의 주문단일건의 배송/클레임 정보를 조회하는 Method 입니다.

## 시그니처

```csharp
StdCustomResult<List<ShippingClaimInfo_V2>> GetShippingAndClaimInfoByOrderNo_V2(string OrderNo)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `OrderNo` | String | Y | 9 | 주문번호 | 1000000000 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `shippingStatus` | String | 배송상태<br> 1: 배송대기<br> 2: 배송요청<br> 3: 배송준비<br> 4: 배송중<br> 5: 배송완료 |
| &nbsp;&nbsp;↳ `sellerID` | String | 판매자 ID |
| &nbsp;&nbsp;↳ `packNo` | Int32 | 장바구니 번호 |
| &nbsp;&nbsp;↳ `orderDate` | String | 주문일 |
| &nbsp;&nbsp;↳ `PaymentDate` | String | 결제일 |
| &nbsp;&nbsp;↳ `DeliveredDate` | String | 배송완료일 |
| &nbsp;&nbsp;↳ `buyer` | String | 구매자 |
| &nbsp;&nbsp;↳ `buyer_gata` | String | 구매자명(카타카나) |
| &nbsp;&nbsp;↳ `buyerTel` | String | 구매자 전화번호 |
| &nbsp;&nbsp;↳ `buyerMobile` | String | 구매자 휴대폰번호 |
| &nbsp;&nbsp;↳ `buyerEmail` | String | 구매자 이메일 |
| &nbsp;&nbsp;↳ `OrderType` | String | 주문타입 |
| &nbsp;&nbsp;↳ `orderNo` | Int32 | 주문번호 |
| &nbsp;&nbsp;↳ `itemCode` | String | Qoo10 상품번호 |
| &nbsp;&nbsp;↳ `sellerItemCode` | String | 판매자상품코드 |
| &nbsp;&nbsp;↳ `itemTitle` | String | 상품명 |
| &nbsp;&nbsp;↳ `option` | String | option	옵션정보 |
| &nbsp;&nbsp;↳ `optionCode` | String | 옵션코드 |
| &nbsp;&nbsp;↳ `orderPrice` | Decimal | 주문금액 |
| &nbsp;&nbsp;↳ `orderQty` | Int32 | 주문수량 |
| &nbsp;&nbsp;↳ `discount` | Decimal | 할인금액 |
| &nbsp;&nbsp;↳ `total` | Decimal | 실주문금액(상품가격+옵션가격-할인금액) |
| &nbsp;&nbsp;↳ `receiver` | String | 수취인명 |
| &nbsp;&nbsp;↳ `receiver_gata` | String | 수취인명(카타카나) |
| &nbsp;&nbsp;↳ `shippingCountry` | String | 배송지국가 |
| &nbsp;&nbsp;↳ `zipCode` | String | 배송지우편번호 |
| &nbsp;&nbsp;↳ `shippingAddr` | String | 배송지주소 |
| &nbsp;&nbsp;↳ `receiverTel` | String | 수취인전화번호 |
| &nbsp;&nbsp;↳ `receiverMobile` | String | 수취인 휴대폰번호 |
| &nbsp;&nbsp;↳ `hopeDate` | String | 배송희망일 |
| &nbsp;&nbsp;↳ `senderName` | String | 보내는사람 |
| &nbsp;&nbsp;↳ `senderTel` | String | 보내는사람 전화번호 |
| &nbsp;&nbsp;↳ `senderNation` | String | 보내는사람 국가 |
| &nbsp;&nbsp;↳ `senderZipCode` | String | 보내는사람 우편번호 |
| &nbsp;&nbsp;↳ `senderAddr` | String | 보내는사람 주소 |
| &nbsp;&nbsp;↳ `ShippingWay` | String | 배송방법 |
| &nbsp;&nbsp;↳ `ShippingMsg` | String | 배송메시지 |
| &nbsp;&nbsp;↳ `shippingRateType` | String | 배송비 |
| &nbsp;&nbsp;↳ `PackingNo` | String | 발주될 때 생성되는 패킹 번호 ( 예 : JPP22894429)  |
| &nbsp;&nbsp;↳ `SellerDeliveryNo` | String | 발주될 때 생성되고 패킹 번호와 1:1 매칭되는 판매자 단위 일련 번호 ( 예 : 130705-0003 ) |
| &nbsp;&nbsp;↳ `VoucherCode` | String | 방문수령 인증번호 |
| &nbsp;&nbsp;↳ `paymentNation` | String | 주문국가 |
| &nbsp;&nbsp;↳ `PaymentMethod` | String | 결제방법 |
| &nbsp;&nbsp;↳ `Gift` | String | 사은품 |
| &nbsp;&nbsp;↳ `cod_price` | Decimal | 착불결제금액 |
| &nbsp;&nbsp;↳ `Cart_Discount_Seller` | Decimal | 판매자 부담 장바구니 할인 |
| &nbsp;&nbsp;↳ `Cart_Discount_Qoo10` | Decimal | Qoo10 부담 장바구니 할인 |
| &nbsp;&nbsp;↳ `claimStatus` | String | 클레임상태<br> 1. 취소요청<br> 2. 취소중<br> 3. 취소완료<br> 4. 반품요청<br> 5. 반품중<br> 6. 반품완료<br> 11. 교환 신청<br> 12. 교환 승인<br> 13. 다시 배송 중<br> 14. 미수취 환불 완료<br> 15. 미수취 부분 환불 완료<br> 16. 미납주문 취소 |
| &nbsp;&nbsp;↳ `cancelRefundDate` | String | 취소/반품/교환 완료일 |
| &nbsp;&nbsp;↳ `reason` | String | 취소/반품/교환 사유 |
| &nbsp;&nbsp;↳ `requestDate` | String | 취소/반품/교환 요청일 |
| &nbsp;&nbsp;↳ `shippingDate` | String | 발송일 |
| &nbsp;&nbsp;↳ `currency` | String | 주문금액 통화 |
| &nbsp;&nbsp;↳ `deliveryCompany` | String | 배송사 |
| &nbsp;&nbsp;↳ `trackingNo` | String | 송장번호 |
| &nbsp;&nbsp;↳ `deliveryCompanyReturn` | String | 반품택배사 |
| &nbsp;&nbsp;↳ `trackingNoReturn` | String | 반품송장번호 |
| &nbsp;&nbsp;↳ `pickupAddress` | String | 수거지 주소 |
| &nbsp;&nbsp;↳ `pickupzipCode` | String | 우편번호 |
| &nbsp;&nbsp;↳ `paymentReturnShipping` | String | 반품배송비 지불 |
| &nbsp;&nbsp;↳ `itemCondition` | String | 반품할 상품상태 |
| &nbsp;&nbsp;↳ `CODCancelPrice` | Decimal | COD 결제 주문의 COD 환불 금액 |
| &nbsp;&nbsp;↳ `CODQrefundPrice` | Decimal | COD 결제 주문의 Q통장 환불 금액 |
| &nbsp;&nbsp;↳ `CODCancelRelatedOrder` | String | COD 결제 주문의 환불 관련 주문 |
| &nbsp;&nbsp;↳ `nrDutyTarget` | String | 미수취 신고 사유 (SC : 미수취, SL : 일부 미수취) |
| &nbsp;&nbsp;↳ `nrSolType` | String | 미수취 신고 희망 (ND : 재배송, NC : 환불) |
| &nbsp;&nbsp;↳ `nrPartRefundCnt` | Int32 | 미수취 신고 일부 환불 개수 |
| &nbsp;&nbsp;↳ `nrPartRefundBalance` | Decimal | 미수취 신고 일부 환불 금액 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 단일 주문번호 조회 전용 — 다건/기간 조회는 `GetShippingInfo_v3` 또는 클레임 전용 메서드 사용.
- 배송/클레임 정보가 **동일 응답 객체에 평탄화**되어 함께 반환됨 — `claimStatus`가 채워져 있으면 클레임 진행 중. `shippingStatus`와 별개 축으로 처리.
- `claimStatus` 코드 14/15(미수취 환불 완료/일부)는 미수취 신고 결과 — `nrDutyTarget` / `nrSolType` / `nrPartRefundCnt` / `nrPartRefundBalance` 필드와 함께 해석.
- `CODCancelPrice` / `CODCancelRelatedOrder`는 COD 결제 주문에 한정 — non-COD 주문에서는 무의미.
- `OrderNo` 길이 9자 명세지만 실제 운영에선 10자 이상도 관찰 — `Int32` 범위 내라면 그대로 통과.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
