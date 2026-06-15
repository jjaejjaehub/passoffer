# RequestFileDownload — 정보 다운로드 요청

## 메타

- **메서드명**: `RequestFileDownload`
- **서비스**: `ItemsLookup` (상품 정보 조회)
- **클래스**: `GoodsLookupBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsLookupBiz`)
- **m_no / c_no**: 10040 / 10003
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10040_info.json`, `_raw/10040_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

정보(item, inventory, order, ship)를 다운로드 하는 Method입니다

## 시그니처

```csharp
StdCustomResult<List<RequestFileInfo>> RequestFileDownload(string apply_type, string email, string target_from_dt, string target_to_dt)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `apply_type` | String | Y | 0 | 종류(item, inventory, order, ship) | item |
| `email` | String | N | Max 100 | 이메일(완료시) |  |
| `target_from_dt` | String | N | 10 | 기준 시작일 (YYYY/MM/DD) | 2000/01/11 |
| `target_to_dt` | String | N | 10 | 기준 종료일 (YYYY/MM/DD) | 2000/01/11 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `DownloadType` | String | 다운로드 타입 |
| &nbsp;&nbsp;↳ `DownloadURL` | String | 다운로드 URL |
| &nbsp;&nbsp;↳ `DownloadExplain` | String | 다운로드 설명 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | Success |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Please enter the type of request. |
| -10002 | Search period should be within 90 days. |
| -10003 | Failed requests, please contact the administrator. |
| -10004 | Download request has been signed already. |
| -10005 | You can request 10 times a day. |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- `apply_type` enum: `item` / `inventory` / `order` / `ship` (4종). 그 외 값은 `-10001` 에러.
- **검색 기간 제약**: `target_from_dt` ~ `target_to_dt` 는 90일 이내 (`-10002`).
- **호출 한도**: 하루 10회 (`-10005`). 동일 요청 중복 시 `-10004` (이미 신청됨).
- 비동기 처리 — 즉시 파일이 아닌 다운로드 URL만 응답. 완료 알림은 `email` 입력 시 전송.
- `email` 누락 시 완료 알림 미발송 — 호출자가 `DownloadURL` 폴링 필요 (폴링 주기 명세서 미명시, 미검증).
- 큰 데이터셋(item/order)은 CSV 파일 형태. 어댑터에서 받은 후 파싱 필요.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
