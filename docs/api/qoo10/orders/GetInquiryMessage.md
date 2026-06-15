# GetInquiryMessage — 판매자 문의 조회

## 메타

- **메서드명**: `GetInquiryMessage`
- **서비스**: `CSCenter` (문의 조회 및 처리)
- **클래스**: `CSCenterBiz` (`GMKT.INC.Front.QAPIBiz.CSCenter.CSCenterBiz`)
- **m_no / c_no**: 10055 / 10014
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/10055_info.json`, `_raw/10055_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

처리상태별로 문의를 조회할 Method 입니다.

## 시그니처

```csharp
StdCustomResult<List<InquiryInfo>> GetInquiryMessage(string search_start_dt, string search_end_dt, string proc_status)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `search_start_dt` | String | Y | 8 or 14 | 조회시작일자 20190101 (yyyyMMdd), 20190101153000 (yyyyMMddHHmmss) | 20190101 |
| `search_end_dt` | String | Y | 8 or 14 | 조회종료일자 20190101 (yyyyMMdd), 20190101153000 (yyyyMMddHHmmss) | 20190101 |
| `proc_status` | String | N | 0 | 처리상태(S1, S2, S3) S1: 미답변 S2: 처리중 S3: 완료 | S1 |

## 응답 필드 (Output)

> `ResultObject`는 `List<InquiryInfo>` 배열로 반환되며, 하위 14개 필드는 모두 배열 원소(`InquiryInfo`)의 직하 형제.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _List&lt;InquiryInfo&gt;_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `INQ_TYPE` | String | 문의타입 |
| &nbsp;&nbsp;↳ `SEQ_NO` | Int32 | 문의번호 |
| &nbsp;&nbsp;↳ `QUESTION_NO` | Int32 | 문의 원문번호 |
| &nbsp;&nbsp;↳ `INQ_DT` | String | 문의날짜 |
| &nbsp;&nbsp;↳ `CUST_NM` | String | 고객 이름 |
| &nbsp;&nbsp;↳ `CATE_NM` | String | 카테고리 이름 |
| &nbsp;&nbsp;↳ `CATE_CD` | String | 카테고리 코드 |
| &nbsp;&nbsp;↳ `TITLE` | String | 제목 |
| &nbsp;&nbsp;↳ `CONTENTS` | String | 내용 |
| &nbsp;&nbsp;↳ `GD_NO` | String | 상품번호 |
| &nbsp;&nbsp;↳ `GD_NM` | String | 상품이름 |
| &nbsp;&nbsp;↳ `CONTR_NO` | Int32 |  |
| &nbsp;&nbsp;↳ `CLAIM_YN` | String | Y/N |
| &nbsp;&nbsp;↳ `STATUS` | String | 상태 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Argument error |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `CSCenter` — 배송/클레임과 별도 클래스(`CSCenterBiz`).
- `proc_status` 코드: `S1` 미답변 / `S2` 처리중 / `S3` 완료. 생략 시 전체.
- `INQ_TYPE` 응답에 무엇이 들어오는지 사용자 명세서 미명시 — 실제 호출 결과로 확인 후 본 문서에 누적.
- `CLAIM_YN === 'Y'`이면 클레임과 연결된 문의 — 주문/클레임 매칭 시 `CONTR_NO` 활용 가능.
- 답변 처리는 [`SetInquiryMessage`](./SetInquiryMessage.md) 사용.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
