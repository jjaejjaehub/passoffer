# GetClaimInfo_V3 — 클레임 조회 (미수취 건 추가, 미수취환불건을 미수취로 조회)

## 메타

- **메서드명**: `GetClaimInfo_V3`
- **서비스**: `ShippingBasic` (배송/취소 정보 조회)
- **클래스**: `ShippingBasic` (`GMKT.INC.Front.QAPIBiz.Shipping.ShippingBasic`)
- **m_no / c_no**: 15475 / 10013
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/15475_info.json`, `_raw/15475_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

주문의 클레임상태를 조회하는 Method 입니다.

## 시그니처

```csharp
StdCustomResult<List<ClaimInfo_V2>> GetClaimInfo_V3(string ClaimStat, string search_Sdate, string search_Edate, string search_condition)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ClaimStat` | String | N | 0 | 클레임상태코드<br/> 1. 취소요청<br/> 2. 취소중<br/> 3. 취소완료<br/> 4. 반품요청<br/> 5. 반품중<br/> 6. 반품완료<br/> 11. 교환 신청<br/> 12. 교환 승인<br/> 13. 다시 배송 중<br/> 14. 미수취 환불 완료<br/> 15. 미수취 부분 환불 완료<br/> 16. 미납주문 취소 | 1 |
| `search_Sdate` | String | Y | 8 or 14 | 취소/반품/교환 요청일 : 조회 시작일 | 20190101 (yyyyMMdd), 20190101153000 (yyyyMMddHHmmss) |
| `search_Edate` | String | Y | 8 or 14 | 취소/반품/교환 요청일 : 조회 종료일  | 20190101 (yyyyMMdd), 20190101153000 (yyyyMMddHHmmss) |
| `search_condition` | String | N | 0 | 조회조건<br/> 1:주문일<br/> 2:클레임 요청일<br/> 3:취소/환불 완료일 | 1 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `claimStatus` | String | 처리상태 |
| &nbsp;&nbsp;↳ `cancelRefundDate` | String | 취소/반품/교환 완료일 |
| &nbsp;&nbsp;↳ `reason` | String | 취소/반품/교환 사유 |
| &nbsp;&nbsp;↳ `requestDate` | String | 취소/반품/교환 요청일 |
| &nbsp;&nbsp;↳ `orderDate` | String | 주문일 |
| &nbsp;&nbsp;↳ `PaymentDate` | String | 결제일 |
| &nbsp;&nbsp;↳ `shippingDate` | String | 발송일 |
| &nbsp;&nbsp;↳ `DeliveredDate` | String | 배송완료일 |
| &nbsp;&nbsp;↳ `orderNo` | Int32 | 주문번호 |
| &nbsp;&nbsp;↳ `packNo` | Int32 | 장바구니번호 |
| &nbsp;&nbsp;↳ `itemCode` | String | Qoo10 상품코드 |
| &nbsp;&nbsp;↳ `sellerItemCode` | String | 판매자상품코드 |
| &nbsp;&nbsp;↳ `itemTitle` | String | 상품명 |
| &nbsp;&nbsp;↳ `orderQty` | Int32 | 주문수량 |
| &nbsp;&nbsp;↳ `paymentNation` | String | 주문국가 |
| &nbsp;&nbsp;↳ `currency` | String | 주문금액 통화 |
| &nbsp;&nbsp;↳ `paymentAmount` | Decimal | 결제금액 |
| &nbsp;&nbsp;↳ `deliveryCompany` | String | 택배사 |
| &nbsp;&nbsp;↳ `trackingNo` | String | 송장번호 |
| &nbsp;&nbsp;↳ `deliveryCompanyReturn` | String | 반품택배사 |
| &nbsp;&nbsp;↳ `trackingNoReturn` | String | 반품송장번호 |
| &nbsp;&nbsp;↳ `pickupAddress` | String | 수거지주소 |
| &nbsp;&nbsp;↳ `zipCode` | String | 우편번호 |
| &nbsp;&nbsp;↳ `paymentReturnShipping` | String | 반품배송비 지불 |
| &nbsp;&nbsp;↳ `itemCondition` | String | 반품할 상품상태 |
| &nbsp;&nbsp;↳ `receiver` | String | 수취인명 |
| &nbsp;&nbsp;↳ `receiverTel` | String | 수취인전화번호 |
| &nbsp;&nbsp;↳ `receiverMobile` | String | 수취인 휴대폰번호 |
| &nbsp;&nbsp;↳ `buyer` | String | 구매자명 |
| &nbsp;&nbsp;↳ `buyerTel` | String | 구매자 전화번호 |
| &nbsp;&nbsp;↳ `buyerMobile` | String | 구매자 휴대폰번호 |
| &nbsp;&nbsp;↳ `CODCancelPrice` | Decimal | COD 취소 금액 _(원본 설명이 "구매자 휴대폰번호"로 기재되어 있으나 명백한 오기로 판단 — 필드명 기준)_ |
| &nbsp;&nbsp;↳ `CODQrefundPrice` | Decimal | COD 결제 주문의 Q통장 환불 금액 |
| &nbsp;&nbsp;↳ `CODCancelRelatedOrder` | String | COD 결제 취소 관련 주문번호 _(원본 설명이 "COD 결제 주문의 Q통장 환불 금액"으로 기재되어 있으나 명백한 오기로 판단)_ |
| &nbsp;&nbsp;↳ `nrDutyTarget` | String | 미수취 신고 사유 (SC : 미수취, SL : 일부 미수취) |
| &nbsp;&nbsp;↳ `nrSolType` | String | 미수취 신고 희망 (ND : 재배송, NC : 환불) |
| &nbsp;&nbsp;↳ `nrPartRefundCnt` | Int32 | 미수취 신고 일부 환불 개수 |
| &nbsp;&nbsp;↳ `nrPartRefundBalance` | Decimal | 미수취 신고 일부 환불 금액 |

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Not exists seller info |
| -10002 | Search Date Error |
| -10003 | Searching period exceeds to 90 days. |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 조회 기간은 최대 **90일** (`-10003`).
- `CODCancelPrice`/`CODCancelRelatedOrder`의 원본 설명이 잘못 기재되어 있음 — 필드명 기준으로 해석.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
