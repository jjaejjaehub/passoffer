# UpdateInventoryDataUnit — 조합형 옵션 개별 수정

## 메타

- **메서드명**: `UpdateInventoryDataUnit`
- **서비스**: `ItemsOptions` (상품 옵션 정보 수정)
- **클래스**: `GoodsOptionsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOptionsBiz`)
- **m_no / c_no**: 10021 / 10005
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10021_info.json`, `_raw/10021_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

상품의 조합형옵션정보의 개별항목을 수정하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult UpdateInventoryDataUnit(string ItemCode, string SellerCode, string OptionName, string OptionValue, string OptionCode, Decimal Price, int Qty)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품 코드 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `OptionName` | String | Y | Max 50 | 옵션명 | カラー、サイズ |
| `OptionValue` | String | Y | Max 50 | 옵션값 | RED,S,M,L |
| `OptionCode` | String | Y | Max 50 | 옵션코드 | Red_S |
| `Price` | Decimal | N | 1~999999999 | 옵션가격 <br> *옵션가격은 판매가격에 -50%~50%이며 0엔인 선택지가 1개이상 필요합니다.  | 5000 |
| `Qty` | Int32 | N | 0~2147483647 | 옵션수량 | 100 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | API 호출 결과 코드 (성공=0, 실패=-999, -990, -101…etc) |
| `ResultMsg` | String | 성공 및 실패 사유  |

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

- **반영 지연**: 정보 수정 시 상품 페이지 반영까지 최대 10분 소요.
- **상품 식별**: `ItemCode` primary, `SellerCode` 보조. 미존재 시 `-10001`.
- **옵션 행 식별**: `OptionName` + `OptionValue` 조합으로 행 식별 (OptionCode 단독 식별 불가). 어댑터의 `channelVariantId` 기반 호출은 변환 로직 필요.
- **다축 옵션 구분자**: `OptionName`/`OptionValue`/`OptionCode` 모두 `||*` 구분자로 다축 표현 (예: `カラー||*サイズ`, `RED||*S`).
- **옵션가격 제약**: `Price`는 판매가격 대비 -50% ~ +50%, 가격차 0엔(기준 동일가) 선택지 1개 이상 필수. Decimal 1~999999999.
- **수량 범위**: `Qty` 0 ~ 2147483647 (Int32).
- **`Price`/`Qty` 미전송 시**: 두 필드 모두 N이지만 옵션 미변경값 그대로 재전송 권장 — 호출 시 빈 값/0 처리 동작 명세서 미명시 (미검증).
- **벌크 처리**: 500개 단위 수정은 [`UpdateInventoryDataBulk`](./UpdateInventoryDataBulk.md) 사용.
- **어댑터 호출 이슈**: `Qoo10Adapter.ts:1275`의 `ItemsBasic.SetSellerCodeToOption` 호출은 셀러 API 목록에 존재하지 않는 가상 메서드 — 본 메서드로 교체 필요.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
