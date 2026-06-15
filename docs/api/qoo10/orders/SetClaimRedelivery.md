# SetClaimRedelivery — 교환 재배송 API

## 메타

- **메서드명**: `SetClaimRedelivery`
- **서비스**: `Claim` (클레임)
- **클래스**: `ClaimBiz` (`GMKT.INC.Front.QAPIBiz.Claim.ClaimBiz`)
- **m_no / c_no**: 10061 / 10015
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/10061_info.json`, `_raw/10061_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

교환상품을 재배송하는 Method입니다.

## 시그니처

```csharp
StdResult SetClaimRedelivery(string orderNo, string redelivery_date, string invoice_no, string del_comapny_name, string rcv_name, string rcv_zip_code, string rcv_front_address, string rcv_back_address, string rcv_hp_no, string rcv_tel_no)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `orderNo` | String | Y | int | 주문번호 | 123456789 |
| `redelivery_date` | String | Y | 0 | 재 발송일<br>예）2019-01-01 (yyyy-MM-dd), 2019-01-01 15:30:00 (yyyy-MM-dd HH:mm:ss) | 2019-01-01 |
| `invoice_no` | String | N | Max 50 | 송장번호 | 1234567890AA |
| `del_comapny_name` | String | N | Max 200 | 택배사 | 佐川急便 |
| `rcv_name` | String | N | Max 200 | 수취인명 | 山田太郎 |
| `rcv_zip_code` | String | N | Max 10 | 수취인주소 우편번호 | 123-1234 |
| `rcv_front_address` | String | N | Max 200 | 앞단 수취인 주소(도도부현/시구정촌) | OO県OOO市 |
| `rcv_back_address` | String | N | Max 200 | 뒷단 수취인주소(시구정촌 이후) | OOO‐OO、OOOOマンションOO号室 |
| `rcv_hp_no` | String | N | Max 20 | 수취인 휴대폰번호 | 090-0000-0000 |
| `rcv_tel_no` | String | N | Max 20 | 수취안 전호번호 | 1234-56-7890 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | 결과코드 |
| `ResultMsg` | String | 결과메시지 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | 주문번호가 잘못되었습니다. |
| -10002 | 주문정보가 없습니다. |
| -10003 | 판매자정보가 올바르지 않습니다. |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `Claim` (10015) — 교환 승인([`SetClaimAccept`](./SetClaimAccept.md)) 이후 재배송 단계에서 호출.
- `del_comapny_name` 파라미터명에 오타 (`comapny`) — Qoo10 측 spec 그대로 사용해야 함. 코드에서 수정 금지.
- `rcv_tel_no` 설명에 "수취안 전호번호" 오타 — 무시.
- 단건 주문 송장 입력은 [`SetSendingInfo`](./SetSendingInfo.md), 본 메서드는 **교환 케이스 전용** — 일반 발송 경로로 잘못 호출하지 말 것.
- `redelivery_date` 포맷은 일반 발송과 달리 `YYYY-MM-DD` (하이픈 있음) — `EstShipDt`의 `YYYYMMDD`와 혼동 주의.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
