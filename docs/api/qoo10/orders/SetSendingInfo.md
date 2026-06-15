# SetSendingInfo — 발송확인 API, Make Shipping Stat at D3

## 메타

- **메서드명**: `SetSendingInfo`
- **서비스**: `ShippingBasic` (배송/취소 정보 조회)
- **클래스**: `ShippingBasic` (`GMKT.INC.Front.QAPIBiz.Shipping.ShippingBasic`)
- **m_no / c_no**: 10042 / 10013
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/10042_info.json`, `_raw/10042_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

배송 요청건에 대해 발송확인 처리를 하는 Method 입니다.

## 시그니처

```csharp
StdResult SetSendingInfo(string orderno, string shippingcorp, string trackingno)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `OrderNo` | String | Y | int | 주문번호 | 1062428737 |
| `ShippingCorp` | String | Y | Max 200 | 택배사 | ゆうパック |
| `TrackingNo` | String | Y | Max 50 | 송장번호 | 1234567890AA |

## 응답 필드 (Output)

> 본 메서드는 `ResultObject` 없이 최상위 `ResultCode` / `ResultMsg`만 반환한다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | 결과코드 |
| `ResultMsg` | String | 결과메시지 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
