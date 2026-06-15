# SetGoodsPriceQtyBulk — 판매가격/재고수량/판매종료일수정(복수)

## 메타

- **메서드명**: `SetGoodsPriceQtyBulk`
- **서비스**: `ItemsOrder` (상품 가격 & 수량 정보 수정)
- **클래스**: `GoodsOrderBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOrderBiz`)
- **m_no / c_no**: 15238 / 10006
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15238_info.json`, `_raw/15238_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

복수의 상품의 가격/재고를 수정하는 기능입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdCustomResult<List<Dictionary<string, object>>> SetGoodsPriceQtyBulk(string ItemInfoJson)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemInfoJson` | String | N | Max500 | JSON 형식의 가격, 수량, 만료일, 소비세율 (최대 500)<br/> 예: [{"ItemCode":"String","SellerCode":"String","Price":String,"Qty":String,"ExpireDate":"String","TaxRate":"String"},{"ItemCode":"String","SellerCode":"String","Price":String,"Qty":String,"ExpireDate":"String","TaxRate":"String"}] | [{"ItemCode":"String","SellerCode":"String","Price":String,"Qty":String,"ExpireDate":"String","TaxRate":"String"},{"ItemCode":"String","SellerCode":"String","Price":String,"Qty":String,"ExpireDate":"String","TaxRate":"String"}] |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `Count` | Int32 |  |
| &nbsp;&nbsp;↳ `Keys` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `Count` | Int32 |  |
| &nbsp;&nbsp;↳ `Values` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `Count` | Int32 |  |

## 성공 판정

- HTTP 200 AND `ResultObject.Count >= 0` (총 처리 라인 수)
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | success count (성공 라인 수) — 전체 성공 |
| -1 | fail count (실패 라인 수, `Keys`/`Values`에 라인별 상세) — 부분 실패 1건 이상 |
| -2 | 500 limit 초과 — `ItemInfoJson` 배열 길이가 500을 넘었음 |
| -10000 | Please check the Seller Authorization Key. |
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsOrder` (10006) — 단건 [`SetGoodsPriceQty`](./SetGoodsPriceQty.md)의 일괄 버전. 같은 그룹: [`EditGoodsOrderLimit`](./EditGoodsOrderLimit.md).
- **요청 한도 500** — 초과 시 즉시 `-2`. 클라이언트에서 500 단위로 청크 분할 필수.
- 입력은 `ItemInfoJson` 1개 필드 (form-urlencoded, JSON 문자열). 라인 구조 `{ItemCode, SellerCode, Price, Qty, ExpireDate, TaxRate}` 모두 String.
- 라인별 필드는 단건 [`SetGoodsPriceQty`](./SetGoodsPriceQty.md)와 동일 규칙:
  - `Price` 변경 시 옵션가 `-50%~+50%` 제약 재검증 (본 상품가 기준).
  - `ExpireDate` Null/빈 문자열 시 **자동 1년 연장**. 의도치 않은 연장을 피하려면 명시값 또는 필드 생략 전략 검토.
  - `TaxRate` — `S` / `10` / `8` / `0`. 누락 시 기존 설정 유지로 추정.
- **부분 성공 가능** — `ResultObject.Keys`/`Values`에 라인별 결과/사유. `-1` 응답 시 실패 라인만 추출해 재시도.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
