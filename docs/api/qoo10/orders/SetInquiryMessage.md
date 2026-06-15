# SetInquiryMessage — 문의 처리

## 메타

- **메서드명**: `SetInquiryMessage`
- **서비스**: `CSCenter` (문의 조회 및 처리)
- **클래스**: `CSCenterBiz` (`GMKT.INC.Front.QAPIBiz.CSCenter.CSCenterBiz`)
- **m_no / c_no**: 10056 / 10014
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/10056_info.json`, `_raw/10056_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

문의를 처리하기 위한 Method 입니다.

## 시그니처

```csharp
StdCustomResult<InquiryProcInfo> SetInquiryMessage(string inq_type, string question_no, string seq_no, string contents)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `inq_type` | String | Y | 0 | 문의타입 (MSG, HELP, ITEM) | MSG |
| `question_no` | String | Y | int | 문의 원문번호 | 12345678 |
| `seq_no` | String | Y | int | 문의번호 | 12345678 |
| `contents` | String | N | Max 4000 | 답변내용 | お問い合わせいただきありがとうございます。 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `SEQ_NO` | Int32 | 문의번호 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Argument error |
| -10002 | Fail |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `CSCenter` (10014) — 배송/클레임과 별도 클래스(`CSCenterBiz`).
- `inq_type` 값: `MSG` / `HELP` / `ITEM` — 정확한 의미 매핑은 사용자 명세서 미명시, 실제 호출로 확인.
- `question_no`와 `seq_no`는 [`GetInquiryMessage`](./GetInquiryMessage.md) 응답의 `QUESTION_NO` / `SEQ_NO`를 그대로 사용.
- `contents` Max 4000자 — 호출 전 길이 가드 필수.
- 응답은 새 답변의 `SEQ_NO`만 반환 — 답변 본문/시각은 별도 조회 필요.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
