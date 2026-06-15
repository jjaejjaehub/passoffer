# UpdateGoods — 상품 편집

## 메타

- **메서드명**: `UpdateGoods`
- **서비스**: `ItemsBasic` (상품 정보 등록 & 수정)
- **클래스**: `GoodsBasicBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsBasicBiz`)
- **m_no / c_no**: 10010 / 10004
- **그룹**: 상품 관리
- **버전**: 1.1
- **원본 크롤링 파일**: `_raw/10010_info.json`, `_raw/10010_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 판매자 상품을 수정하기 위한 API 메소드입니다. 

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult UpdateGoods(string ItemCode, string SecondSubCat, string ItemTitle, string ShortTitle, string BriefDescription, string SellerCode, string IndustrialCodeType, string IndustrialCode, string BrandNo, string ManufactureNo, string ManufactureDate, string ModelNm, string Material, string ProductionPlaceType, string ProductionPlace, string RetailPrice, string Gift, string DisplayLeftPeriod, string AudultYN, string ContactTel, string ContactEmail, string ShippingNo, string OptionShippingNo1, string OptionShippingNo2, string Weight, string DesiredShippingDate, string AvailableDateType, string AvailableDateValue)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품번호 9~10자리(반각숫자) | 1234567890 |
| `SecondSubCat` | String | Y | Max20 | 상품의 카테고리에 대한 Qoo10 카테고리 코드입니다. *QSM BulK-data Management에서 Qoo10 카테고리 코드 정보를 다운로드하실 수 있습니다. (ex.300000001) | 320001873 |
| `Drugtype` | String | N | 2 | 의약품 카테고리 선택 시 필수로 입려해야합니다. (1C : 제1류 의약품, 2C : 제2류 의약품, 3C : 제3류 의약품, D2 : 지정제2류 의약품, QD : 의약외품) | 1C |
| `ItemTitle` | String | Y | Max 100 | 상품명 최대100자 | パーフェクティングファンデーション35mlリキッドファンデーション |
| `PromotionName` | String | N | Max20 | 홍보용 상품명 최대20문자 | 오늘만 특가 1+1 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `IndustrialCodeType` | String | N | 1 | 산업 코드 타입<br> J: JAN, K: KAN, I: ISBN, U: UPC, E: EAN, H: HS | J |
| `IndustrialCode` | String | N | 13 | 제품의 산업 코드입니다.  (JAN, ISBN…등) 표준코드를 입력하면 가격비교 사이트에 우선 노출될 수 있습니다. | TK-FBP019EBK |
| `BrandNo` | String | N | Max 10 | Qoo10에 등록된 브랜드에 대한 코드입니다. 신규 브랜드 등록요청은 QSM을 통해서 요청하실 수 있습니다. (ex.36458) | 100550 |
| `ManufactureDate` | String | N | 7 | 상품 제조일자(YYYY-MM-DD) | 2025-01-01 |
| `ModelNm` | String | N | Max 30 | 제품번호 최대30자 | CUH-7218BB01 |
| `Material` | String | N | Max 500 | 상품의 소재 *최대500자까지 | 綿50%, ポリエステル50% |
| `ProductionPlaceType` | String | Y | 1 | 원산지 타입 (국내=1, 해외=2, 기타=3) 타입에 따라 원산지(ProductionPlace)에 입력 가능한 값이 다릅니다. | 1 |
| `ProductionPlace` | String | N | Max 50 | 상품의 원산지 정보(국가 또는 지역명) Type1: TOKYO *도도부현명을 로마자로 표기(대문자) Type2: KR ＊국가코드 Type3: 자유입력(50자까지) *영문숫자,특수기호, 한자,히라가나,가타카나 모두 가능 | TOKYO |
| `RetailPrice` | String | N | 1~999999999 | 소매정가입니다. 만약 소매가격을 알 수 없는 경우 0으로입력하시길 바랍니다. | 15000 |
| `AdultYN` | String | Y | 1 | 성인용품여부: 성인 상품인 경우 Y, 성인 상품이 아닌 경우 N | N |
| `ContactInfo` | String | N | Max100 | 서비스 담당자 정보 | 電話番号: 090-0000-0000 / メールアドレス: xxx@xxx.xxx |
| `ShippingNo` | String | N | 0 | Qoo10 배송비코드  QSM 배송비 관리 메뉴에서 사용할 배송비의 코드를 확인하시길 바랍니다. 0으로 입력 시 무료배송비가 설정 됩니다. | 123456 |
| `OptionShippingNo1` | String | N | 0~2147483647 | 구매자가 주문 시 배송비를 선택할 수 있도록 상품에 추가로 설정하는 배송비 코드 QSM 배송비 관리 메뉴에서 사용할 배송비의 코드를 확인하시길 바랍니다. | 123456 |
| `OptionShippingNo2` | String | N | 0~2147483647 | 구매자가 주문 시 배송비를 선택할 수 있도록 상품에 추가로 설정하는 배송비 코드 QSM 배송비 관리 메뉴에서 사용할 배송비의 코드를 확인하시길 바랍니다. | 223456 |
| `Weight` | String | N | kg | 상품 무게 *최대 2자리(숫자, 소수점 이하 1자리까지 가능), 최대 30kg | 1.2  |
| `DesiredShippingDate` | String | N | Max 2 | 배송희망일. 3~20이내(주문일 기준으로 선택가능일)  | 3 |
| `AvailableDateType` | String | Y | 1 | 상품 발송 가능일 유형입니다. 숫자로 입력해 주세요. (0,1,2,3)<br/>  - 0: 일반발송 (3영업일 내 발송 가능한 상품)<br/>  | 0 |
| `AvailableDateValue` | String | Y | 10 | 상품 발송 가능일 유형 상세내용 입니다.<br/>- 시간을 입력할 경우 당일발송 상품이 됩니다. (당일 발송 시간 입력 ex: 14:30)<br/>- 1~3을 입력할 경우 일반발송 상품이 됩니다. (일발 발송일 입력 ex:1)<br/>- 4~14를 입력할 경우 상품 준비일 설정 상품이 됩니다. (상품 준비일 입력 ex: 5)<br/>- 날짜 형식으로 입력할 경우 출시 예정일이 됩니다. (출시일 입력 ex: 2013/09/26) | 2 |
| `Keyword` | String | N | Max 10 keywords, a keyword: Max 30 | 검색용 키워드 최대 10개까지 설정 가능 (ex, 셔츠,데님셔츠,청남방) | シャツ,デニム,春 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | API 호출 결과 코드 (성공=0, 실패=-999, -990, -101…etc) |
| `ResultMsg` | String | 성공 및 실패 사유 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Fail to find Item information with 'ItemCode','SellerCode'. |
| -10002 | Please check the 'SecondSubCat'. |
| -10003 | Please check the 'AvailableDateType' and 'AvailableDateValue'. |
| -10004 | Please check the 'ProductionPlaceType' and 'ProductionPlace'. |
| -10005 | Please check the 'BrandNo'. |
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- **반영 지연**: 정보 수정 시 상품 페이지 반영까지 최대 10분 소요. 호출 직후 검증 시 지연 고려.
- **상품 식별**: `ItemCode` (Qoo10 상품번호) 필수. `SellerCode` 와 함께 조회 가능하지만 `ItemCode` 가 primary.
- **카테고리**: `SecondSubCat` 은 QSM Bulk-data Management 에서 다운받은 코드 사용. 잘못된 코드 시 `-10002`.
- **AvailableDateType × AvailableDateValue 조합** (`-10003`):
  - Type `0` (일반발송, 3영업일 내): Value `1~3` 일수.
  - Type 별 의미: 시간 형식 (`14:30`)=당일발송, `1~3`=일반발송, `4~14`=상품준비일, 날짜(`2013/09/26`)=출시예정일.
- **ProductionPlaceType × ProductionPlace 조합** (`-10004`):
  - `1` 국내: 도도부현명 로마자 대문자 (`TOKYO`).
  - `2` 해외: 국가코드 (`KR`).
  - `3` 기타: 자유입력 50자 (영문/숫자/특수기호/한자/히라가나/가타카나).
- **Drugtype**: 의약품 카테고리 선택 시 필수 (`1C`/`2C`/`3C`/`D2`/`QD`). 일반 카테고리는 비워두기.
- **BrandNo**: Qoo10 사전 등록된 브랜드 코드만 허용 (`-10005`). 신규 브랜드는 QSM에서 등록 요청 선행.
- **IndustrialCode**: JAN/ISBN 등 표준코드 입력 시 가격비교 사이트 우선 노출.
- **OptionShippingNo1/2**: 옵션 배송비 코드. 상세 설정은 [`SetGoodsSubDeliveryGroup`](./SetGoodsSubDeliveryGroup.md) 와 연관.
- **ShippingNo**: `0` 입력 시 무료배송.
- **Weight**: 최대 30kg, 소수점 1자리까지 (`1.2`).
- **Keyword**: 최대 10개 키워드, 각 최대 30자 (`シャツ,デニム,春`).
- **명세서 누락 잉여 필드** (시그니처에는 존재, 명세서 파라미터 표 미수록 — 미검증):
  - `ShortTitle`, `BriefDescription`, `ManufactureNo`, `Gift`, `DisplayLeftPeriod`, `ContactTel`, `ContactEmail` — 시그니처상 String 타입이지만 동작/길이 제약 미확인. 사용 전 실제 호출 검증 필요. 명세서 `ContactInfo` 로 통합 가능성도 미확인.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
