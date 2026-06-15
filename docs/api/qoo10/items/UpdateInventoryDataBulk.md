# UpdateInventoryDataBulk — 재고 정보 수정 메소드(대량)

## 메타

- **메서드명**: `UpdateInventoryDataBulk`
- **서비스**: `ItemsOptions` (상품 옵션 정보 수정)
- **클래스**: `GoodsOptionsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOptionsBiz`)
- **m_no / c_no**: 15237 / 10005
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15237_info.json`, `_raw/15237_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

복수 상품의 조합형옵션정보의 개별항목을 수정하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdCustomResult<List<Dictionary<string, object>>> UpdateInventoryDataBulk(string ItemInfoJson)
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

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | Total success |
| -1 | There's more than one failure |
| -2 | Exceeded the maximum count of items (500) |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- **반영 지연**: 상품 페이지 반영까지 최대 10분 소요.
- **최대 500개 제한**: 1회 호출당 `ItemInfoJson` 배열 최대 500 요소. 초과 시 `-2`. 호출자가 500개 단위로 청크 분할 필요.
- **부분 실패 처리**: 일부 항목만 실패하면 `ResultCode = -1` 반환, `ResultObject.Values` 에 개별 결과 포함. 성공만 처리하지 말고 Values 순회로 실패 항목 분리 필요.
- **응답 구조** (Bulk 공통):
  - `ResultObject.Count`: 처리 시도 총 개수.
  - `ResultObject.Keys`: 입력 식별자 배열 (ItemCode/OptionCode 등).
  - `ResultObject.Values`: 항목별 결과 배열 (인덱스 매칭).
- **옵션가격 제약**: 판매가격 대비 -50% ~ +50%, 그리고 가격차 0엔(기준 동일가) 선택지 1개 이상 필수. 위반 시 개별 항목 실패.
- **JSON 직렬화**: `ItemInfoJson` 은 string 타입이므로 객체 배열을 `JSON.stringify` 후 전달. 옵션 구분자 `||*` 이스케이프 주의.
- **필드 구조** (`ItemInfoJson` 요소): `ItemCode`, `SellerCode`, `OptionName`, `OptionValue`, `OptionCode`, `Price`, `Qty`. `OptionName`/`OptionValue`/`OptionCode` 는 `||*` 구분 다축 옵션.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
