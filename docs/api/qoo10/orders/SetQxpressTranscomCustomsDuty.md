# SetQxpressTranscomCustomsDuty — QXPress 관세금 데이터 관리

## 메타

- **메서드명**: `SetQxpressTranscomCustomsDuty`
- **서비스**: `DPCShipping` ()
- **클래스**: `DPCShippingBiz` (`GMKT.INC.Front.QAPIBiz.Shipping.DPCShippingBiz`)
- **m_no / c_no**: 10069 / 10016
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/10069_info.json`, `_raw/10069_params.json`
- **명세서 수록**: 미수록 (미검증) — 사용자 명세서 `Qoo10_QSM_API_명세서.md` 에 본 메서드 없음. 본 문서는 원본 크롤링 기반이며 결정론적 검증 불가.
- **최종 갱신**: 2026-06-11

## 설명

QXPress 관세금으로 등록된 데이터를 관리하는 Method입니다.

## 시그니처

```csharp
StdResult SetQxpressTranscomCustomsDuty(string type, string duty_no, string giosis_no, string no_songjang, string svc_nation_cd, string start_nation_cd, string delivery_nation_cd, string customs_dt, string customs_duty, string currency_cd, string customs_duty_origin, string currency_cd_origin, string sell_cust_no, string reg_id)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `type` | String | N | 0 | 처리 구분 |  |
| `duty_no` | String | N | 0 | duty no |  |
| `giosis_no` | String | N | 0 | giosis no |  |
| `no_songjang` | String | N | 0 | 송장 번호 |  |
| `svc_nation_cd` | String | N | 0 | 서비스 국가 코드 |  |
| `start_nation_cd` | String | N | 0 | 출발 국가 코드 |  |
| `delivery_nation_cd` | String | N | 0 | 도착 국가 코드 |  |
| `customs_dt` | String | N | 0 | 관세 부과일 |  |
| `customs_duty` | String | N | 0 | 관세 금액 |  |
| `currency_cd` | String | N | 0 | 관세통화 코드 |  |
| `customs_duty_origin` | String | N | 0 | 원 관세금액 |  |
| `currency_cd_origin` | String | N | 0 | 원 관세통화 코드 |  |
| `sell_cust_no` | String | N | 0 | 판매자 고객 번호 |  |
| `reg_id` | String | N | 0 | API User 정보 |  |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

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
