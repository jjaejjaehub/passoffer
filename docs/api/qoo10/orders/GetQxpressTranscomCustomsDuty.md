# GetQxpressTranscomCustomsDuty — QXPress 관세금 등록 데이터 조회

## 메타

- **메서드명**: `GetQxpressTranscomCustomsDuty`
- **서비스**: `DPCShipping` ()
- **클래스**: `DPCShippingBiz` (`GMKT.INC.Front.QAPIBiz.Shipping.DPCShippingBiz`)
- **m_no / c_no**: 10068 / 10016
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/10068_info.json`, `_raw/10068_params.json`
- **명세서 수록**: 미수록 (미검증) — 사용자 명세서 `Qoo10_QSM_API_명세서.md` 에 본 메서드 없음. 본 문서는 원본 크롤링 기반이며 결정론적 검증 불가.
- **최종 갱신**: 2026-06-11

## 설명

QXPress 관세금으로 등록된 데이터를 조회하는 Method입니다.

## 시그니처

```csharp
StdCustomResult<List<CustomsDutyInfo>> GetQxpressTranscomCustomsDuty(DateTime start_dt, DateTime end_dt, string detail_type, string detail_value)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `start_dt` | DateTime | N | 0 | 조회 시작일자 |  |
| `end_dt` | DateTime | N | 0 | 조회 종료일자 |  |
| `detail_type` | String | N | 0 | 상세 조회조건 구분 |  |
| `detail_value` | String | N | 0 | 상세 조회조건 값 |  |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `DutyNo` | String | 관세번호 |
| &nbsp;&nbsp;↳ `GiosisNo` | String | giosis no |
| &nbsp;&nbsp;↳ `InvoiceNo` | String | 송장번호 |
| &nbsp;&nbsp;↳ `PackingNo` | String | 발주될 때 생성되는 패킹 번호  |
| &nbsp;&nbsp;↳ `SvcNationCd` | String | 서비스국가코드 |
| &nbsp;&nbsp;↳ `StartNationCd` | String | 출발국가 코드 |
| &nbsp;&nbsp;↳ `DeliveryNationCd` | String | 도착국가코드 |
| &nbsp;&nbsp;↳ `CustomsDt` | String | 관세부과일 |
| &nbsp;&nbsp;↳ `CustomsDuty` | String | 소비자 관세금액 |
| &nbsp;&nbsp;↳ `CurrencyCd` | String | 통화 코드 |
| &nbsp;&nbsp;↳ `CustomsDutyOrigin` | String | 기본 소비자관세 |
| &nbsp;&nbsp;↳ `CurrencyCdOrigin` | String | 기본 통화코드 |
| &nbsp;&nbsp;↳ `SellCustNo` | String | 판매고객번호 |
| &nbsp;&nbsp;↳ `SellCustId` | String | 판매고객ID |
| &nbsp;&nbsp;↳ `RegId` | String | 기록된 ID |
| &nbsp;&nbsp;↳ `RegDt` | String | 기록일 |
| &nbsp;&nbsp;↳ `ChgId` | String | 수정 ID |
| &nbsp;&nbsp;↳ `ChgDt` | String | 수정일 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
