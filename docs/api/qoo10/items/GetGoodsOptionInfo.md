# GetGoodsOptionInfo — 옵션정보 조회

## 메타

- **메서드명**: `GetGoodsOptionInfo`
- **서비스**: `ItemsLookup` (상품 정보 조회)
- **클래스**: `GoodsLookupBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsLookupBiz`)
- **m_no / c_no**: 10004 / 10003
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10004_info.json`, `_raw/10004_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 상품의 단일형 옵션정보를 조회하기 위한 API 메소드입니다.

## 시그니처

```csharp
StdCustomResult<List<ItemOptionInfo>> GetGoodsOptionInfo(string ItemCode, string SellerCode)
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
| &nbsp;&nbsp;↳ `Name` | String | 옵션명 |
| &nbsp;&nbsp;↳ `Value` | String | 옵션값 |
| &nbsp;&nbsp;↳ `Price` | Decimal | 옵션가격 |
| &nbsp;&nbsp;↳ `OptionCode` | String | 판매자 옵션코드 |

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

- 서비스 그룹 `ItemsLookup` (10003) — 상품 정보 조회. 같은 그룹: [`GetGoodsInventoryInfo`](./GetGoodsInventoryInfo.md), [`GetItemDetailInfo`](./GetItemDetailInfo.md).
- **명칭 함정** — 메서드명은 "옵션정보"이지만 명세서 기능 경로는 "상품 조회 > 옵션정보 조회 > **추가구성정보** 조회" + 설명은 "**단일형 옵션정보**". 사실상 단일형(독립형) 옵션 조회로 추정. 조합형(다축)은 [`GetGoodsInventoryInfo`](./GetGoodsInventoryInfo.md)로 추정 (미검증 — 호출 결과로 검증 필요).
- `ItemCode` 표는 `Y` 필수이지만 설명에 "ItemCode 또는 SellerCode 중 1개는 필수" — 둘 중 하나만 보내도 동작할 가능성. 안전하게 둘 다 전송 권장.
- 응답은 옵션 리스트 (`List<ItemOptionInfo>`). 빈 리스트 = 옵션 미등록 상품 (성공).
- `Price` Decimal — 옵션가격. -50%~+50% 제약은 등록/수정 시 검증되며 조회는 그대로 반환.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
