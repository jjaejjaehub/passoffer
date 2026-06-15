# EditItemCondition — 상품 상태(새상품, 중고여부) 변경

## 메타

- **메서드명**: `EditItemCondition`
- **서비스**: `ItemsBasic` (상품 정보 등록 & 수정)
- **클래스**: `GoodsBasicBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsBasicBiz`)
- **m_no / c_no**: 10014 / 10004
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10014_info.json`, `_raw/10014_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 상품의 상품상태(새상품, 중고여부)정보를 변경하는 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult EditItemCondition(string ItemCode, string SellerCode, string ItemCondition, string UseCondition, string UsedPeriod, string BriefExplain)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품번호 9~10자리(반각숫자) | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `ItemCondition` | String | Y | 1 | 상품의 상태 (새상품=N, 중고상품=U) | N |
| `UseCondition` | String | N | 1~7 | 중고상품 등록시 사용상태에 대한 정보 빈값 혹은 0-거의새것 1-리퍼브 2-미사용 3-거의새것 4-상태좋음 5-약간낡음 6-사용불가(수집가용) | 2 |

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
| -10002 | The Item Condition is incorrect. |
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsBasic` — 상품 정보 등록 & 수정. [`EditGoodsStatus`](./EditGoodsStatus.md)와 동일 그룹.
- `ItemCondition` — **`N`(신상품) / `U`(중고)** 단일 문자만 허용. 그 외 값은 `-10002`.
- `UseCondition` — `ItemCondition = U`일 때만 의미가 있음. **0~6 enum**:
  - `0` 거의 새것 / `1` 리퍼브 / `2` 미사용 / `3` 거의 새것 / `4` 상태좋음 / `5` 약간 낡음 / `6` 사용불가(수집가용)
  - 사용자 명세서에 `0`과 `3`이 동일하게 "거의 새것"으로 표기됨 — 둘 중 어느 쪽을 보낼지 사전 정의 필요 (기본 `0` 권장).
- `UsedPeriod` / `BriefExplain` — 시그니처에는 있으나 파라미터 표에 누락. 명세서 line 671-712 기준 선택 필드로 추정 (미검증 — 작업 중 확인 후 갱신).
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
