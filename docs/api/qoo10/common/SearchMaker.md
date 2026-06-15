# SearchMaker — 제조사 검색

## 메타

- **메서드명**: `SearchMaker`
- **서비스**: `CommonInfoLookup` (공통 정보 조회)
- **클래스**: `CommonInfoLookupBiz` (`GMKT.INC.Front.QAPIBiz.CommonInfo.CommonInfoLookupBiz`)
- **m_no / c_no**: 10038 / 10011
- **그룹**: 공통조회
- **원본 크롤링 파일**: `_raw/10038_info.json`, `_raw/10038_params.json`
- **출처**: 사용자 명세서 미수록 — 기존 크롤링 데이터 기반 (미검증)
- **최종 갱신**: 2026-06-11

> ⚠️ **미검증** — 사용자 작성 `Qoo10_QSM_API_명세서.md`에 정의되지 않은 메서드. 같은 `CommonInfoLookup` (10011) 그룹의 [`SearchBrand`](./SearchBrand.md) 와 시그니처/응답 구조가 동일 (`M_B_NO`/`M_B_NM`/`M_B_NM_EN`). 실제 호출 결과로 검증 필요.

## 설명

제조사를 검색하기위한 Method 입니다.

## 시그니처

```csharp
StdCustomResult<List<CommonMakerInfo>> SearchMaker(string keyword)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `keyword` | String | N | Max 50 | 키워드 |  |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `M_B_NO` | String | 제조사 번호 |
| &nbsp;&nbsp;↳ `M_B_NM` | String | 제조사 이름 |
| &nbsp;&nbsp;↳ `M_B_NM_EN` | String | 제조사 영문이름 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- ⚠️ **사용자 명세서 미수록** — 실제 호출 가능 여부 / 키워드 매칭 동작 (부분일치/완전일치) 미검증.
- 서비스 그룹 `CommonInfoLookup` (10011) — 공통 마스터 조회. 같은 그룹: [`GetCatagoryListAll`](./GetCatagoryListAll.md), [`SearchBrand`](./SearchBrand.md).
- 응답 구조가 `SearchBrand`와 동일하므로 어댑터에서 공용 DTO 재사용 가능 (`M_B_NO`/`M_B_NM`/`M_B_NM_EN`).
- 상품 등록 시 [`SetNewGoods`](../items/SetNewGoods.md) 의 제조사 관련 필드 (`Maker` 등) 매핑 — 명세서에 매핑 필드명 미명시 (미검증).
- `keyword` 미입력 허용 (필수 N) — 전체 조회 가능성 있으나 응답 크기 우려, 키워드 최소 1자 강제 권장.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
