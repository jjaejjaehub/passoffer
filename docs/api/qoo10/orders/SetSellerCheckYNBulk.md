# SetSellerCheckYNBulk — 배송조회API - 발주확인 상태 변경 (대량)

## 메타

- **메서드명**: `SetSellerCheckYNBulk`
- **서비스**: `ShippingBasic` (배송/취소 정보 조회)
- **클래스**: `ShippingBasic` (`GMKT.INC.Front.QAPIBiz.Shipping.ShippingBasic`)
- **m_no / c_no**: 15772 / 10013
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/15772_info.json`, `_raw/15772_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

배송준비 상태로 변경하는 Method입니다. (복수 주문에 대해 요청을 할 수 있습니다. 1회 요청 시 최대 500건)

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `SendPlanDtInfoJson` | String | N | 0 | JSON 형식의 주문번호, 발송예정일, 지연사유, 판매자메모<br> [{"OrderNo":"String","EstShipDt":"String","DelayType":"String","DelayMemo":"String"},{"OrderNo":"String", "EstShipDt":"String","DelayType":"String","DelayMemo":"String"},{"OrderNo":"String", "EstShipDt":"String","DelayType":"String","DelayMemo":"String"}]<br><br> - 주문번호: 최대 500개<br> - 발송예정일: YYYYMMDD<br> - 지연사유 (1:상품준비중, 2:주문제작, 3:고객요청, 4:기타) |  [{"OrderNo":"123400000","EstShipDt":"20240101","DelayType":"","DelayMemo":"" },{"OrderNo":"567800000", "EstShipDt":"20240101","DelayType":"3","DelayMemo":"TEST"}] |

## 응답 필드 (Output)

> `ResultObject` 하위 4개 필드는 모두 `ResultObject` 직하 형제 (사용자 명세서 기준 평탄화).

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `cont_no` | Int32 | 컨트롤 번호 |
| &nbsp;&nbsp;↳ `result_cd` | Int32 | 개별 처리 결과 코드 |
| &nbsp;&nbsp;↳ `ResultCode` | Int32 | 결과코드 |
| &nbsp;&nbsp;↳ `ResultMsg` | String | 결과메시지 _(사용자 명세서엔 Int32로 기재되어 있으나 명백한 오기로 판단)_ |

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Not exists seller info |
| -10011 | Over the limit (최대 500건 초과) |
| -10012 | 이미 발주확인 처리된 주문 |
| -10013 | 배송요청 상태가 아닌 주문 |
| -10016 | EstShipDt is null |
| -10017 | 발송예정일이 허용 가능한 최대 일자를 초과 |
| -10018 | 발송예정일은 오늘 이후여야 함 |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 성공 판정

- HTTP 200 AND `ResultCode === 0` (전체 호출)
- 개별 주문 처리 결과는 `ResultObject[].result_cd === 0` 으로 별도 확인

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- **최대 500건** 1회 요청 제한 (`-10011`).
- `DelayType` 값: `1` 상품준비중 / `2` 주문제작 / `3` 고객요청 / `4` 기타.
- `EstShipDt`는 `YYYYMMDD` (8자) — `SetSellerCheckYN_V2`와 동일.
- 발송예정일은 **오늘 이후**여야 하며 (`-10018`), 채널 허용 최대 일자도 별도 존재 (`-10017`).
- 이미 발주확인된 주문은 `-10012` — 재호출 전 상태 확인 필요.
- 응답이 배열 단위로 내려오므로 `ResultObject`는 `Array<{ cont_no, result_cd, ResultCode, ResultMsg }>` 형태로 파싱해야 함.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
