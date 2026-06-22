# GetSellerDeliveryGroupInfo — 배송비 정보 조회

## 메타

- **메서드명**: `GetSellerDeliveryGroupInfo`
- **서비스**: `ItemsLookup` (상품 정보 조회)
- **클래스**: `GoodsLookupBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsLookupBiz`)
- **m_no / c_no**: 10006 / 10003
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10006_info.json`, `_raw/10006_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

판매자의 배송비정보를 조회하기 위한 API 메소드입니다.

## 시그니처

```csharp
StdCustomResult<List<DeliveryGroupInfo>> GetSellerDeliveryGroupInfo()
```

## 요청 파라미터 (Input)

_없음_

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `ShippingNo` | Int32 | 배송비 코드 |
| &nbsp;&nbsp;↳ `ShippingFee` | Decimal | 기본 배송비 |
| &nbsp;&nbsp;↳ `ShippingType` | String | 배송비 종류  (무료=X, 유료=F, 조건부무료=M, 방문수령=W, 착불-선결제 불가=D, 착불-선결제 가능=R) |
| &nbsp;&nbsp;↳ `FreeCondition` | Decimal | 무료배송비 조건금액 |
| &nbsp;&nbsp;↳ `Region` | String | 지역별 배송비 설정여부 (설정한 경우 =Y, 하지 않은경우=N) |
| &nbsp;&nbsp;↳ `Oversea` | String | 해외배송비 세팅여부 (설정한 경우 =Y, 하지 않은경우=N) |
| &nbsp;&nbsp;↳ `transcName` | String | 배송사 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | Success |
| -10000 | Please check the Seller Authorization Key. |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsLookup` (10003) — 판매자 단위 정보 조회. 상품 등록/수정 시 `ShippingNo`(배송비 코드) 매핑에 사용.
- **파라미터 없음** — 셀러 키 단독으로 전체 배송비 그룹을 반환. 응답은 리스트 (`List<DeliveryGroupInfo>`).
- `ShippingType` enum — `X`(무료) / `F`(유료) / `M`(조건부무료) / `W`(방문수령) / `D`(착불 선결제 불가) / `R`(착불 선결제 가능). DB 매핑 시 enum 별도 정의.
- `FreeCondition` — `ShippingType = M`일 때만 의미. 단위는 엔(JPY) 추정 (미검증).
- `Region`/`Oversea` — `Y`/`N` 플래그. 지역별/해외 배송비 상세 조회는 별도 메서드일 가능성 (미검증).
- `transcName` — 배송사 표시명. 식별자가 아닌 표시용 (송장 발행 메서드의 `SCD` 코드와 별개).


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
