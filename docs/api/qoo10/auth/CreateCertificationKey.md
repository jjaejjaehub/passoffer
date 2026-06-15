# CreateCertificationKey — 판매자 인증키 생성

## 메타

- **메서드명**: `CreateCertificationKey`
- **서비스**: `CertificationAPI` (판매자 인증키 발급)
- **클래스**: `CertificationAPI` (`GMKT.INC.Front.QAPIBiz.Certification.CertificationAPI`)
- **m_no / c_no**: 10041 / 10012
- **그룹**: 판매자 인증
- **원본 크롤링 파일**: `_raw/10041_info.json`, `_raw/10041_params.json`
- **명세서 수록**: 미수록 (미검증) — 사용자 명세서 `Qoo10_QSM_API_명세서.md` 에 본 메서드 없음. 본 문서는 원본 크롤링 기반이며 결정론적 검증 불가.
- **최종 갱신**: 2026-05-22

## 설명

판매자인증키(Certification Key)를 발급하는 메서드입니다.

## 시그니처

```csharp
StdCustomResult<string> CreateCertificationKey(string user_id, string pwd)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `user_id` | String | Y | 0 | 사용자 ID | Qoo10id |
| `pwd` | String | Y | 0 | 비밀번호 | Qoo10test |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | String | 판매자인증키 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
