# UpdateInventoryQtyPlusUnit — 조합형 옵션 개별 수량 수정(현재수량 기준 가감 계산)

## 메타

- **메서드명**: `UpdateInventoryQtyPlusUnit`
- **서비스**: `ItemsOptions` (상품 옵션 정보 수정)
- **클래스**: `GoodsOptionsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOptionsBiz`)
- **m_no / c_no**: 10023 / 10005
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10023_info.json`, `_raw/10023_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

상품의 조합형옵션정보의 옵션별 수량항목을 수정하기 위한 API 메소드입니다.(현재수량 기준 가감계산)

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult UpdateInventoryQtyPlusUnit(string ItemCode, string SellerCode, string OptionName, string OptionValue, string OptionCode, int PlusQty)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품 코드 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `OptionName` | String | Y | Max 50 | 옵션명 | カラー、サイズ |
| `OptionValue` | String | Y | Max 50 | 옵션값 | RED,S,M,L |
| `OptionCode` | String | Y | Max 50 | 옵션코드 | Red_S |
| `PlusQty` | Int32 | N | 0~2147483647 | 변동량 현재 설정된 옵션수량에 더하거나 뺄 수량 | -1일 경우 현재수량에서 1 을 뺌 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | API 호출 결과 코드 (성공=0, 실패=-999, -990, -101…etc) |
| `ResultMsg` | String |  성공 및 실패 사유 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Fail to find Item information with 'ItemCode','SellerCode'. |
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- **반영 지연**: 최대 10분.
- **가감 계산 (delta) 메서드**: `PlusQty` 는 절대값이 아닌 **현재 수량 대비 변동량**. `-1` → 현재값 -1, `+5` → 현재값 +5. 절대 수량 설정은 [`UpdateInventoryQtyUnit`](./UpdateInventoryQtyUnit.md) 사용.
- **음수 입력**: 명세서 `Length` 컬럼에는 `0~2147483647` 만 명시되어 있으나 Description/Example 에는 `-1일 경우 현재수량에서 1을 뺌` 명시 — Int32 음수 허용 (Length 컬럼 표기 부정확 가능, 미검증).
- **옵션 행 식별**: `OptionName` + `OptionValue` 조합으로 행 식별. 다축 옵션은 `||*` 구분자.
- **동시성 주의**: 가감 연산이므로 동시 요청 시 race condition 가능 — 호출자가 순차 보장 필요.
- **언더플로우**: 결과 수량이 음수가 될 입력은 명세서 미명시 (미검증) — 0 으로 클램프되는지 에러 반환인지 확인 필요.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
