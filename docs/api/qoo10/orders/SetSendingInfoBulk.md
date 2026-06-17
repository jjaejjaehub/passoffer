# SetSendingInfoBulk — 발송확인 API, Make Shipping Stat at D3

## 메타

- **메서드명**: `SetSendingInfoBulk`
- **서비스**: `ShippingBasic` (배송/취소 정보 조회)
- **클래스**: `ShippingBasic` (`GMKT.INC.Front.QAPIBiz.Shipping.ShippingBasic`)
- **m_no / c_no**: 15773 / 10013
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/15773_info.json`, `_raw/15773_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

배송 요청건에 대해 발송확인 처리를 하는 Method 입니다. (복수 주문에 대해 요청을 할 수 있습니다. 1회 요청 시 최대 500건)

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ShippingInfoJson` | String | N | 0 | JSON 형식의 주문번호, 택배사, 송장번호<br> [{"OrderNo":string,"ShippingCorp":string,"TrackingNo":string},{"OrderNo":string,"ShippingCorp":string,"TrackingNo":string},{"OrderNo":string,"ShippingCorp":string,"TrackingNo":string}]<br><br> | [{"OrderNo":"123400000","ShippingCorp":"Qxpress","TrackingNo":"A1234567890"},{"OrderNo":"567800000","ShippingCorp":"Qxpress","TrackingNo":"B1234567890"}] |

## 응답 필드 (Output)

> `ResultObject` 하위 5개 필드는 모두 `ResultObject` 직하 형제 (사용자 명세서 기준 평탄화).

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `contr_no` | Int32 | 컨트롤 번호 |
| &nbsp;&nbsp;↳ `result_cd` | Int32 | 개별 처리 결과 코드 |
| &nbsp;&nbsp;↳ `transc_nm` | String | 택배사명 (송장 발급 결과) _(사용자 명세서엔 Int32로 기재되어 있으나 명백한 오기로 판단)_ |
| &nbsp;&nbsp;↳ `ResultCode` | Int32 | 결과코드 |
| &nbsp;&nbsp;↳ `ResultMsg` | String | 결과메시지 _(사용자 명세서엔 Int32로 기재되어 있으나 명백한 오기로 판단)_ |

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Not exists seller info |
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

- **최대 500건** 1회 요청 제한 — `ShippingInfoJson` 배열 길이 가드 필수.
- `transc_nm`(택배사명)이 응답에 추가되는 것이 [`SetSellerCheckYNBulk`](./SetSellerCheckYNBulk.md)와의 차이점 — 송장 발급 결과 검증에 사용.
- 응답이 배열 단위로 내려오므로 `ResultObject`는 `Array<{ contr_no, result_cd, transc_nm, ResultCode, ResultMsg }>` 형태로 파싱해야 함.
- 단건은 [`SetSendingInfo`](./SetSendingInfo.md) 사용 — 응답 형태 자체가 다름 (`ResultObject` 없음).

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
