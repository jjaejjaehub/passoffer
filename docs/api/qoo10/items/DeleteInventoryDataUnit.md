# DeleteInventoryDataUnit — 조합형 옵션 개별 삭제

## 메타

- **메서드명**: `DeleteInventoryDataUnit`
- **서비스**: `ItemsOptions` (상품 옵션 정보 수정)
- **클래스**: `GoodsOptionsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOptionsBiz`)
- **m_no / c_no**: 10019 / 10005
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10019_info.json`, `_raw/10019_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 상품의 조합협 옵션정보를 삭제하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult DeleteInventoryDataUnit(string ItemCode, string SellerCode, string OptionName, string OptionValue, string OptionCode)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품 코드 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `OptionName` | String | Y | Max 50 | 옵션명 | カラー、サイズ |
| `OptionValue` | String | Y | Max 50 | 옵션값 | RED,S,M,L |
| `OptionCode` | String | Y | Max 50 | 옵션코드 | Red_S |

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

- 서비스 그룹 `ItemsOptions` (10005) — 조합형 옵션 단건 삭제 전용. 전체 옵션 재설정은 [`EditGoodsOption`](./EditGoodsOption.md) 참조.
- `ItemCode` + `OptionName` + `OptionValue` + `OptionCode` **4개 키 모두 일치**해야 삭제됨 — 옵션 키 일부만 알면 호출 전 [`GetGoodsInventoryInfo`](./GetGoodsInventoryInfo.md)로 정확한 조합 조회 권장.
- 상품페이지 반영까지 **최대 10분 지연** — 삭제 직후 조회 시 캐시 잔존 가능.
- `SellerCode`는 선택이지만 동일 `ItemCode` 미존재/모호 시 보조 식별자로 함께 전송.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
