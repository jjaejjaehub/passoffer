# SetQwmsCargoStat — QWMS 화물 배송상태 업데이트

## 메타

- **메서드명**: `SetQwmsCargoStat`
- **서비스**: `DPCShipping` ()
- **클래스**: `DPCShippingBiz` (`GMKT.INC.Front.QAPIBiz.Shipping.DPCShippingBiz`)
- **m_no / c_no**: 10064 / 10016
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/10064_info.json`, `_raw/10064_params.json`
- **명세서 수록**: 미수록 (미검증) — 사용자 명세서 `Qoo10_QSM_API_명세서.md` 에 본 메서드 없음. 본 문서는 원본 크롤링 기반이며 결정론적 검증 불가.
- **최종 갱신**: 2026-06-11

## 설명

QWMS 화물 배송상태룰 업데이트 Method입니다.

## 시그니처

```csharp
StdResult SetQwmsCargoStat(string cargo_no, string cargo_stat, string remark)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `cargo_no` | String | N | 0 | 대상 cargo no |  |
| `cargo_stat` | String | N | 0 | 업데이트 cargo 상태 |  |
| `remark` | String | N | 0 | 비고 |  |

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
