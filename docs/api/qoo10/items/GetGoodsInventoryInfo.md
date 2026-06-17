# GetGoodsInventoryInfo — 재고정보 조회

## 메타

- **메서드명**: `GetGoodsInventoryInfo`
- **서비스**: `ItemsLookup` (상품 정보 조회)
- **클래스**: `GoodsLookupBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsLookupBiz`)
- **m_no / c_no**: 10005 / 10003
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10005_info.json`, `_raw/10005_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 판매자 상품의 조합형 옵션정보를 조회하기 위한 API 메소드입니다.

## 시그니처

```csharp
StdCustomResult<List<ItemInventoryInfo>> GetGoodsInventoryInfo(string ItemCode, string SellerCode)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | Qoo10 상품코드<br> * Qoo10 상품코드 또는 판매자 상품코드 중 1개는 필수 입력 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `Name1` | String | 옵션명1 |
| &nbsp;&nbsp;↳ `Value1` | String | 옵션값1 |
| &nbsp;&nbsp;↳ `Name2` | String | 옵션명2 |
| &nbsp;&nbsp;↳ `Value2` | String | 옵션값2 |
| &nbsp;&nbsp;↳ `Name3` | String | 옵션명3 |
| &nbsp;&nbsp;↳ `Value3` | String | 옵션값3 |
| &nbsp;&nbsp;↳ `Name4` | String | 옵션명4 |
| &nbsp;&nbsp;↳ `Value4` | String | 옵션값4 |
| &nbsp;&nbsp;↳ `Name5` | String | 옵션명5 |
| &nbsp;&nbsp;↳ `Value5` | String | 옵션값5 |
| &nbsp;&nbsp;↳ `Price` | Decimal | 옵션가격 |
| &nbsp;&nbsp;↳ `Qty` | Int32 | 재고수량 |
| &nbsp;&nbsp;↳ `ItemTypeCode` | String | 판매자옵션코드 |

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

- 서비스 그룹 `ItemsLookup` (10003) — 상품 정보 조회. **조합형(다축) 옵션 조회**의 정식 메서드. 단일형은 [`GetGoodsOptionInfo`](./GetGoodsOptionInfo.md).
- 응답 라인 1개당 **다축 옵션 1조합** — `Name1/Value1 ~ Name5/Value5` 평면 구조 (최대 5축). 사용 안 한 축은 빈 문자열로 추정 (미검증).
- `ItemTypeCode` — 명세서 표기상 "판매자옵션코드". 등록 메서드의 `OptionCode`와 동일 의미 (등록/조회 키 명이 다름).
- `ItemCode` 또는 `SellerCode` 중 1개 필수 — 안전하게 둘 다 전송 권장.
- 빈 응답 = 옵션 미등록 상품 (성공). 단일형 옵션만 있는 상품도 빈 응답 가능 (미검증 — 호출 결과로 검증).


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
