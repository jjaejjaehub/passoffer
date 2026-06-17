# InsertInventoryDataBulk — 재고 정보 등록 메소드(대량)

## 메타

- **메서드명**: `InsertInventoryDataBulk`
- **서비스**: `ItemsOptions` (상품 옵션 정보 수정)
- **클래스**: `GoodsOptionsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOptionsBiz`)
- **m_no / c_no**: 15236 / 10005
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15236_info.json`, `_raw/15236_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 복수 상품에 조합형 옵션정보를 추가 등록하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdCustomResult<List<Dictionary<string, object>>> InsertInventoryDataBulk(string ItemInfoJson)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemInfoJson` | String | Y | 0 | 옵션 정보 (최대 500)<br> *옵션가격은 판매가격에 -50%~50%이며 0엔인 선택지가 1개이상 필요합니다.   | [{"ItemCode":"String","SellerCode":"String","OptionName":"String\|\|*String","OptionValue":"String\|\|*String","OptionCode":"String\|\|*String","Price":String,"Qty":String},{"ItemCode":"String","SellerCode":"String","OptionName":"String\|\|*String","OptionValue":"String\|\|*String |

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
| 0 | success count (성공 라인 수) |
| -1 | fail count (실패 라인 수, `Keys`/`Values`에 라인별 상세) |
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

- 서비스 그룹 `ItemsOptions` (10005) — **조합형 옵션 일괄 등록**. 단건은 [`InsertInventoryDataUnit`](./InsertInventoryDataUnit.md), 수정은 [`EditGoodsInventory`](./EditGoodsInventory.md), 수량만 수정은 [`EditCommonGoodsInventory`](./EditCommonGoodsInventory.md), 단건 삭제는 [`DeleteInventoryDataUnit`](./DeleteInventoryDataUnit.md).
- **다축 옵션 일괄 등록의 정식 메서드**. 기존 `Qoo10Adapter.ts:1129`의 `ItemsBasic.SetGoodsOptionInfo` 호출은 셀러 API 목록에 존재하지 않는 가상 메서드이므로 본 메서드로 교체 필요.
- **요청 한도 500** — 초과 시 즉시 `-2`. 클라이언트에서 500 단위로 청크 분할 필수.
- 입력은 `ItemInfoJson` 1개 필드 (form-urlencoded, JSON 문자열). 각 라인: `{ItemCode, SellerCode, OptionName, OptionValue, OptionCode, Price, Qty}`.
  - `OptionName`/`OptionValue` — `||*` 구분자로 다축 결합 (`"색상||*사이즈"`, `"빨강||*M"`).
- **옵션가격 제약** — 본 상품 판매가의 -50%~+50% + **0엔 선택지 1개 이상 필수**.
- **부분 성공 가능** — `ResultObject.Keys`/`Values`에 라인별 결과(성공/실패 사유) 포함. 500 라인 호출에서 일부만 실패 가능하므로 응답을 라인 단위로 매핑하여 재시도 대상 식별.
- 상품페이지 반영까지 **최대 10분 지연**.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
