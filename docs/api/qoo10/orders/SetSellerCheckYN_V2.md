# SetSellerCheckYN_V2 — 배송조회API - 발주확인 상태 변경

## 메타

- **메서드명**: `SetSellerCheckYN_V2`
- **서비스**: `ShippingBasic` (배송/취소 정보 조회)
- **클래스**: `ShippingBasic` (`GMKT.INC.Front.QAPIBiz.Shipping.ShippingBasic`)
- **m_no / c_no**: 10050 / 10013
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/10050_info.json`, `_raw/10050_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

배송준비 상태로 변경하는 Method입니다

## 시그니처

```csharp
StdResult SetSellerCheckYN_V2(string OrderNo, string EstShipDt, string DelayType, string DelayMemo)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `OrderNo` | String | Y | int | 주문번호 | 110066710 |
| `EstShipDt` | String | N | 8 | 발송예정일 20190101 (yyyyMMdd) | 20190101 |
| `DelayType` | String | N | 1 | 지연사유(1:상품준비중,2:주문제작,3:고객요청,4:기타) | 1 |
| `DelayMemo` | String | N | Max 1000 | 판매자 메모 | 不在の場合は管理室に預けてください。 |

## 응답 필드 (Output)

> 본 메서드는 `ResultObject` 없이 최상위 `ResultCode` / `ResultMsg`만 반환한다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | 결과코드 |
| `ResultMsg` | String | 결과메시지 |

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

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- `EstShipDt`는 `YYYYMMDD` 8자 — `SetSellerCheckYNBulk`와 동일.
- `DelayType` 값: `1` 상품준비중 / `2` 주문제작 / `3` 고객요청 / `4` 기타.
- 발송예정일 양방향 동기화의 단건 진입점. 대량 변경은 [`SetSellerCheckYNBulk`](./SetSellerCheckYNBulk.md) 사용.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
