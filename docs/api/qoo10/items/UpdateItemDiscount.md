# UpdateItemDiscount — 기본할인 수정

## 메타

- **메서드명**: `UpdateItemDiscount`
- **서비스**: `ItemsOrder` (상품 가격 & 수량 정보 수정)
- **클래스**: `GoodsOrderBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOrderBiz`)
- **m_no / c_no**: 10025 / 10006
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10025_info.json`, `_raw/10025_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

등록한 상품에 할인을 설정/수정하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult UpdateItemDiscount(string ItemCode, string SellerCode, string BeginDate, string EndDate, string CostPrice, string DiscountType)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품 코드 숫자 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `BeginDate` | String | N | 10 | 할인 시작일(YYYY-MM-DD) | 2025-06-01 |
| `EndDate` | String | N | 10 | 할인 종료일(YYYY-MM-DD) | 2025-05-31 |
| `CostPrice` | String | N | Max 999999999 | 할인 금액(type1: 1~49%, type2: 0~999999999) | 10 |
| `DiscountType` | String | Y | 1 | 할인 타입 (할인없음=0, 정률할인=1, 정액할인=2) | 1 |

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
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- **반영 지연**: 최대 10분.
- **상품 식별**: `ItemCode` primary, `SellerCode` 보조. 미존재 시 `-10001`.
- **DiscountType 분기**:
  - `0` = 할인 없음. 호출 시 기존 할인 해제 용도 (`CostPrice`/`BeginDate`/`EndDate` 무시 가능, 미검증).
  - `1` = 정률 할인 (%). `CostPrice` 는 1 ~ 49 범위 (50% 이상 불가).
  - `2` = 정액 할인 (엔). `CostPrice` 는 0 ~ 999,999,999.
- **CostPrice 타입 주의**: String 으로 전달하지만 의미는 숫자. `DiscountType`별 허용 범위가 달라 사전 검증 필요.
- **기간 (`BeginDate`/`EndDate`)**:
  - `YYYY-MM-DD` 포맷, 길이 10.
  - 둘 다 N 이므로 무기한 할인 가능성 있음 (미검증).
  - `EndDate < BeginDate` 케이스 검증 동작 명세서 미명시 (미검증).
- **할인 해제**: `DiscountType=0` 으로 호출이 해제 패턴으로 보이나 명세서 명시 부재 (미검증) — 실 호출 검증 필요.
- **마스터 모델 연동**: 마스터 가격 동기화 시 `RetailPrice` (UpdateGoods) 와 `CostPrice` (UpdateItemDiscount) 분리 호출 필요.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
