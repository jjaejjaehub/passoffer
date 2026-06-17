# GetCatagoryListAll — 카테고리 조회

## 메타

- **메서드명**: `GetCatagoryListAll`
- **서비스**: `CommonInfoLookup` (공통 정보 조회)
- **클래스**: `CommonInfoLookupBiz` (`GMKT.INC.Front.QAPIBiz.CommonInfo.CommonInfoLookupBiz`)
- **m_no / c_no**: 10037 / 10011
- **그룹**: 공통조회
- **원본 크롤링 파일**: `_raw/10037_info.json`, `_raw/10037_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

모든 카테고리를 조회하기 위한 Method 입니다.

## 시그니처

```csharp
StdCustomResult<List<CommonCategoryInfo>> GetCatagoryListAll(string lang_cd)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `lang_cd` | String | N | 2 | 언어코드 일본어: JA 한국어: KO 영어: EN 중국어: ZH-CN | JA |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `CATE_L_CD` | String | 카테코고리 대분류코드 |
| &nbsp;&nbsp;↳ `CATE_L_NM` | String | 카테코고리 대분류이름 |
| &nbsp;&nbsp;↳ `CATE_M_CD` | String | 카테코고리 중분류코드 |
| &nbsp;&nbsp;↳ `CATE_M_NM` | String | 카테코고리 중분류이름 |
| &nbsp;&nbsp;↳ `CATE_S_CD` | String | 카테코고리 소분류코드 |
| &nbsp;&nbsp;↳ `CATE_S_NM` | String | 카테코고리 소분류이름 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | Success |
| -10000 | Please check the Seller Authorization Key. |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `CommonInfoLookup` (10011) — 카테고리/브랜드/제조사 등 공통 마스터 조회. 같은 그룹: [`SearchBrand`](./SearchBrand.md), [`SearchMaker`](./SearchMaker.md).
- `lang_cd` 미입력 시 기본값 동작은 명세서 미명시 (미검증 — `JA` 추정). 안정성을 위해 명시 전송 권장.
- **평면 응답** — 한 줄 = `(대분류, 중분류, 소분류)` 한 조합. 트리 구조가 필요하면 클라이언트에서 `CATE_L_CD` → `CATE_M_CD` → `CATE_S_CD` 그룹화 필요.
- 상품 등록 시 [`SetNewGoods`](../items/SetNewGoods.md) 의 `MainCatCd`/`FirstSubCatCd`/`SecondSubCatCd`는 각각 `CATE_L_CD`/`CATE_M_CD`/`CATE_S_CD`에 매핑.
- 응답 크기가 매우 클 수 있음 (전체 카테고리 트리). 동기화 시 일간 1회 캐시 권장, 매 호출 지양.
- 언어코드 enum — `JA`/`KO`/`EN`/`ZH-CN` (4종). 그 외는 동작 미정의 (미검증).

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
