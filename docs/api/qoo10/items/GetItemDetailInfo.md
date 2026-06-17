# GetItemDetailInfo — 상품 상세 정보 조회

## 메타

- **메서드명**: `GetItemDetailInfo`
- **서비스**: `ItemsLookup` (상품 정보 조회)
- **클래스**: `GoodsLookupBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsLookupBiz`)
- **m_no / c_no**: 10007 / 10003
- **그룹**: 상품 관리
- **버전**: 1.2
- **원본 크롤링 파일**: `_raw/10007_info.json`, `_raw/10007_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

상품 코드를 입력하여 단일 상품의 상품 정보를 조회하는 Method입니다.

업데이트 안내

-버전 1.2 업데이트 : 옵션 배송비 코드 정보 추가 (OptionShippingNo1/OptionShippingNo2)

## 시그니처

```csharp
StdCustomResult<List<ItemDetailInfo>> GetItemDetailInfo(string ItemCode, string SellerCode)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | Qoo10 상품코드<br> * Qoo10 상품코드 또는 판매자 상품코드 중 1개는 필수 입력 | 1234567890 |
| `SellerCode` | string | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `ItemCode` | String | 등록된 상품의 Qoo10 상품 코드 |
| &nbsp;&nbsp;↳ `ItemStatus` | String | 상품의 거래상태 (거래대기=S1, 거래가능=S2) |
| &nbsp;&nbsp;↳ `ItemTitle` | String | 상품명 |
| &nbsp;&nbsp;↳ `PromotionName` | String | 홍보용 상품명 |
| &nbsp;&nbsp;↳ `MainCatCd` | String | Qoo10 상품에 대한 메인카테고리 코드 입니다. (ex.100000001) |
| &nbsp;&nbsp;↳ `MainCatNm` | String | Qoo10 상품에 대한 메인카테고리 명 입니다. (ex.Women’s Clothing) |
| &nbsp;&nbsp;↳ `FirstSubCatCd` | String | Qoo10 상품에 대한 서브카테고리 코드 입니다. (ex.200000001) |
| &nbsp;&nbsp;↳ `FirstSubCatNm` | String | Qoo10 상품에 대한 서브카테고리 명 입니다. (ex.Dresses) |
| &nbsp;&nbsp;↳ `SecondSubCatCd` | String | Qoo10 상품에 대한 세컨서브카테고리 코드 입니다. (ex.300000001) |
| &nbsp;&nbsp;↳ `SecondSubCatNm` | String | Qoo10 상품에 대한 세컨서브카테고리 명 입니다. (ex.Casual Dress) |
| &nbsp;&nbsp;↳ `Drugtype` | String | 의약품 카테고리 선택 시 필수로 입려해야합니다. (1C : 제1류 의약품, 2C : 제2류 의약품, 3C : 제3류 의약품, D2 : 지정제2류 의약품, QD : 의약외품) |
| &nbsp;&nbsp;↳ `SellerCode` | String | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  |
| &nbsp;&nbsp;↳ `ProductionPlaceType` | String | 원산지 타입 (국내=1, 해외=2, 기타=3) |
| &nbsp;&nbsp;↳ `ProductionPlace` | String | 상품의 원산지 정보 국가 또는 지역명 |
| &nbsp;&nbsp;↳ `IndustrialCodeType` | String | 산업 코드 타입 (J: JAN, K: KAN, I: ISBN, U: UPC, E: EAN, H: HS) |
| &nbsp;&nbsp;↳ `IndustrialCode` | String | 제품의 산업 코드입니다.  (JAN, ISBN…등) 표준코드를 입력하면 가격비교 사이트에 우선 노출될 수 있습니다. |
| &nbsp;&nbsp;↳ `RetailPrice` | String | 공급원가(정산가격) 해당 상품 판매 시 판매가에서 수수료를 제외하고 정산받을 금액입니다. |
| &nbsp;&nbsp;↳ `ItemPrice` | String | 상품의 판매가 |
| &nbsp;&nbsp;↳ `TaxRate` | String | 상품에 적용된 소비세율 입니다. |
| &nbsp;&nbsp;↳ `SettlePrice` | String | 공급원가(정산가격) 해당 상품 판매 시 판매가에서 수수료를 제외하고 정산받을 금액입니다. |
| &nbsp;&nbsp;↳ `ItemQty` | String | 판매수량 |
| &nbsp;&nbsp;↳ `ExpireDate` | String | 상품 판매 종료 (yyyy-mm-dd) 형식으로 입력 하시갈바랍니다. Null 로입력 시 1년 후로 설정됩니다 |
| &nbsp;&nbsp;↳ `ModelNM` | String | 제품번호 |
| &nbsp;&nbsp;↳ `ManufacturerDate` | String | 제조사명 |
| &nbsp;&nbsp;↳ `BrandNo` | String | 브랜드명 |
| &nbsp;&nbsp;↳ `Material` | String | 상품의 소재 (ex: Polyester 50%, Synthetic 50%) |
| &nbsp;&nbsp;↳ `AdultYN` | String | 성인 상품인 경우 Y 성인 상품이 아닌 경우 N |
| &nbsp;&nbsp;↳ `DesiredShippingDate` | String | 희망배송일 배송을 위한 최소 준비기간입니다. 설정된 준비기간  이후로 구매자가 주문 시 희망배송일을 선택할 수 있습니다. (사용안함=null, 준비기간=3~20사이 숫자) |
| &nbsp;&nbsp;↳ `AvailableDateType` | String | 상품 발송 가능일 유형입니다. 숫자로 입력해 주세요. (0,1,2,3)<br/>  - 0: 일반발송 (3영업일 내 발송 가능한 상품)<br/>  - 1: 상품준비일<br/>  - 2: 출시일<br/>  - 3: 당일발송<br/>  |
| &nbsp;&nbsp;↳ `AvailableDateValue` | String | 상품 발송 가능일 유형 상세내용 입니다.<br/>- 시간을 입력할 경우 당일발송 상품이 됩니다. (당일 발송 시간 입력 ex: 14:30)<br/>- 1~3을 입력할 경우 일반발송 상품이 됩니다. (일발 발송일 입력 ex:1)<br/>- 4~14를 입력할 경우 상품 준비일 설정 상품이 됩니다. (상품 준비일 입력 ex: 5)<br/>- 날짜 형식으로 입력할 경우 출시 예정일이 됩니다. (출시일 입력 ex: 2013/09/26) |
| &nbsp;&nbsp;↳ `ShippingNo` | String | Qoo10 배송비코드  QSM 배송비 관리 메뉴에서 사용할 배송비의 코드를 확인하시길 바랍니다. 0으로 입력 시 무료배송비가 설정 됩니다. |
| &nbsp;&nbsp;↳ `ContactInfo` | String | 판매자 연락처 |
| &nbsp;&nbsp;↳ `ItemDetail` | String | 상품설명 상품페이지에 안내되는 상품설명입니다. |
| &nbsp;&nbsp;↳ `ImageUrl` | String | 상품의 대표 이미지 상품 이미지 URL을 입력하시길 바랍니다. (ex. standardimage=http://image.qoo10.jo.img.jpg) |
| &nbsp;&nbsp;↳ `VideoURL` | String | 동영상 URL |
| &nbsp;&nbsp;↳ `Keyword` | String | 검색용 키워드 최대 10개까지 설정 가능 (ex, 셔츠,데님셔츠,청남방) |
| &nbsp;&nbsp;↳ `ListedDate` | String | 상품 등록일 |
| &nbsp;&nbsp;↳ `ChangedDate` | String | 상품 수정일(상품정보가 마지막으로 수정된 날짜) |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | Success |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Fail to find Item information with 'ItemCode','SellerCode'. |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsLookup` (10003) — 상품 단건 상세 조회. 같은 그룹: [`GetGoodsOptionInfo`](./GetGoodsOptionInfo.md), [`GetGoodsInventoryInfo`](./GetGoodsInventoryInfo.md), [`GetSellerDeliveryGroupInfo`](./GetSellerDeliveryGroupInfo.md).
- **버전 1.2** — `OptionShippingNo1`/`OptionShippingNo2` (옵션 배송비 코드) 추가. 명세서 응답 필드 표에는 미반영이나 버전 안내에 명시 (미검증 — 실제 응답 확인 후 어댑터에 매핑).
- `ItemCode` 또는 `SellerCode` 중 1개 필수 — 둘 다 전송 권장 (`ItemCode` 우선).
- **모든 응답 필드가 String** — 가격(`RetailPrice`/`ItemPrice`/`SettlePrice`)/수량(`ItemQty`) 등 숫자 의미 필드도 String. 어댑터에서 Number 파싱 필요.
- `ItemStatus` enum — `S1` 거래대기 / `S2` 거래가능 (상세 조회 응답은 2종만). 전체 상태(S0~S8)는 [`GetAllGoodsInfo`](./GetAllGoodsInfo.md) 응답 참고.
- `ShippingNo = 0` — 무료배송. 코드 ↔ 배송비 그룹 매핑은 [`GetSellerDeliveryGroupInfo`](./GetSellerDeliveryGroupInfo.md)로 조회.
- `IndustrialCodeType` enum — `J`(JAN) / `K`(KAN) / `I`(ISBN) / `U`(UPC) / `E`(EAN) / `H`(HS). 가격비교 노출에 영향.
- `ProductionPlaceType` enum — `1`(국내) / `2`(해외) / `3`(기타). `ProductionPlace`는 국가/지역명 String.
- `Drugtype` enum — `1C`/`2C`/`3C`/`D2`/`QD`. 의약품 카테고리 시 필수.
- `AvailableDateType`/`AvailableDateValue` — 발송 가능일 유형/값. Value 형식이 Type에 따라 시간/일수/날짜로 가변. 어댑터 매핑 시 케이스별 파싱 분기 필요.
- `ExpireDate` — `yyyy-mm-dd`. 등록/수정 시 Null이면 자동 1년 연장 (조회는 그대로 반환).
- `DesiredShippingDate` — `null` 또는 `3~20` 숫자 (희망배송일 준비기간).
- `ManufacturerDate` — 명세서 표기상 "제조사명"이나 필드명은 날짜성. 명세서 설명을 그대로 따르되 실제 응답으로 검증 필요 (미검증).

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
