# GetShippingInfo_v3 — 배송상태 조회 v3

## 메타

- **메서드명**: `GetShippingInfo_v3`
- **서비스**: `ShippingBasic` (배송/취소 정보 조회)
- **클래스**: `ShippingBasic` (`GMKT.INC.Front.QAPIBiz.Shipping.ShippingBasic`)
- **m_no / c_no**: 15766 / 10013
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/15766_info.json`, `_raw/15766_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

판매자의 배송상태 정보를 조회하는 Method 입니다.

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ShippingStatus` | String | N | 1 | "배송상태(1: 배송대기, 2: 배송요청, 3: 배송준비, 4: 배송중, 5: 배송완료)<br> *0혹은 공백인 경우 1～3 상태 주문을 조회"  | 1 |
| `SearchStartDate` | String | N | 8 or 14 | 조회시작일자  20230101(yyyyMMdd), 20230101153000(yyyyMMddHHmmss) |  20230101 |
| `SearchEndDate` | String | N | 8 or 14 | 조회종료일자 20230101(yyyyMMdd), 20230101153000(yyyyMMddHHmmss) | 20230101 |
| `SearchCondition` | String | N | 8 or 14 | 일자구분(1：주문일、2：결제일、3：발송일、4：배송완료) | 2 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `ShippingStatus` | String | 배송상태 |
| &nbsp;&nbsp;↳ `SellerID` | String | 판매자ID |
| &nbsp;&nbsp;↳ `PackNo` | Int32 | 장바구니번호 |
| &nbsp;&nbsp;↳ `OrderDate` | String | 주문일 |
| &nbsp;&nbsp;↳ `PaymentDate` | String | 결제일 |
| &nbsp;&nbsp;↳ `EstimatedShippingDate` | String | 발송예정일 |
| &nbsp;&nbsp;↳ `ShippingDate` | String | 발송일 |
| &nbsp;&nbsp;↳ `DeliveredDate` | String | 배송완료일 |
| &nbsp;&nbsp;↳ `Buyer` | String | 구매자명 |
| &nbsp;&nbsp;↳ `BuyerKana` | String | 구매자명(가타카나) |
| &nbsp;&nbsp;↳ `BuyerTel` | String | 구매자전화번호 |
| &nbsp;&nbsp;↳ `BuyerMobile` | String | 구매자휴대폰번호 |
| &nbsp;&nbsp;↳ `BuyerEmail` | String | 구매자이메일 |
| &nbsp;&nbsp;↳ `OrderNo` | Int32 | 주문번호 |
| &nbsp;&nbsp;↳ `ItemNo` | String | Qoo10 상품번호 |
| &nbsp;&nbsp;↳ `SellerItemCode` | String | 판매자상품코드 |
| &nbsp;&nbsp;↳ `ItemTitle` | String | 상품명 |
| &nbsp;&nbsp;↳ `Option` | String | 옵션정보 |
| &nbsp;&nbsp;↳ `OptionCode` | String | 옵션코드 |
| &nbsp;&nbsp;↳ `OrderPrice` | Decimal | 상품가격 |
| &nbsp;&nbsp;↳ `OrderQty` | Int32 | 주문수량 |
| &nbsp;&nbsp;↳ `Discount` | Decimal | 상품할인금액 |
| &nbsp;&nbsp;↳ `Total` | Decimal | 실주문금액(상품가격+옵션가격-할인금액) |
| &nbsp;&nbsp;↳ `Receiver` | String | 수취인명 |
| &nbsp;&nbsp;↳ `ReceiverKana` | String | 수취인명(가타카나) |
| &nbsp;&nbsp;↳ `ZipCode` | String | 배송지우편번호 |
| &nbsp;&nbsp;↳ `ShippingAddress` | String | 배송지주소 |
| &nbsp;&nbsp;↳ `Address1` | String | 주소1 |
| &nbsp;&nbsp;↳ `Address2` | String | 주소2 |
| &nbsp;&nbsp;↳ `ReceiverTel` | String | 수취인전화번호 |
| &nbsp;&nbsp;↳ `ReceiverMobile` | String | 수취인휴대폰번호 |
| &nbsp;&nbsp;↳ `DesiredDeliveryDate` | String | 배송희망일 |
| &nbsp;&nbsp;↳ `SenderName` | String | 보내는사람 |
| &nbsp;&nbsp;↳ `SenderTel` | String | 보내는사람 전화번호 |
| &nbsp;&nbsp;↳ `SenderNation` | String | 보내는사람 국가 |
| &nbsp;&nbsp;↳ `SenderZipCode` | String | 보내는사람 우편번호 |
| &nbsp;&nbsp;↳ `SenderAddress` | String | 보내는사람 주소 |
| &nbsp;&nbsp;↳ `ShippingWay` | String | 배송방법 |
| &nbsp;&nbsp;↳ `ShippingMessage` | String | 배송메시지 |
| &nbsp;&nbsp;↳ `PaymentMethod` | String | 결제수단 |
| &nbsp;&nbsp;↳ `SellerDiscount` | Decimal | 판매자 부담 할인 금액 |
| &nbsp;&nbsp;↳ `Currency` | String | 주문금액 통화 |
| &nbsp;&nbsp;↳ `ShippingRate` | Decimal | 배송비 |
| &nbsp;&nbsp;↳ `RelatedOrder` | String | 관련 주문번호: (, )구분자로 주문 번호 구분 함 예) 12345432, 12343212, 12323232 |
| &nbsp;&nbsp;↳ `ShippingRateType` | String | 배송비그룹 종류: Free / Charge / Free on condition |
| &nbsp;&nbsp;↳ `DeliveryCompany` | String | 배송사 |
| &nbsp;&nbsp;↳ `VoucherCode` | String | 방문수령 인증번호 |
| &nbsp;&nbsp;↳ `PackingNo` | String | 발주될 때 생성되는 패킹 번호(예: JPP22894429) |
| &nbsp;&nbsp;↳ `SellerDeliveryNo` | String | 발주될 때 생성되고 패킹 번호와 1:1 매칭되는 판매자 단위 일련 번호 (예: 130705-0003) |
| &nbsp;&nbsp;↳ `Gift` | String | 사은품 |
| &nbsp;&nbsp;↳ `CartDiscountSeller` | Decimal | 판매자 부담 장바구니 할인 |
| &nbsp;&nbsp;↳ `CartDiscountQoo10` | Decimal | Qoo10 부담 장바구니 할인 |
| &nbsp;&nbsp;↳ `SettlePrice` | Decimal | 총공급원가 |
| &nbsp;&nbsp;↳ `BranchName` | String | 지점명 |
| &nbsp;&nbsp;↳ `TrackingNo` | String | 송장 번호 |
| &nbsp;&nbsp;↳ `Material` | String | 소재 |
| &nbsp;&nbsp;↳ `AvailableSendType` | String | 0: 일반발송 / 1: 예약발송(4일 이상) / 2: 예약발송(출시일) / 3: 당일발송 |
| &nbsp;&nbsp;↳ `AvailableShippingDate` | String | 발송가능일(YYYY-MM-DD) |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
