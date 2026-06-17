# SearchBrand — 브랜드 검색

## 메타

- **메서드명**: `SearchBrand`
- **서비스**: `CommonInfoLookup` (공통 정보 조회)
- **클래스**: `CommonInfoLookupBiz` (`GMKT.INC.Front.QAPIBiz.CommonInfo.CommonInfoLookupBiz`)
- **m_no / c_no**: 10039 / 10011
- **그룹**: 공통조회
- **원본 크롤링 파일**: `_raw/10039_info.json`, `_raw/10039_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

브랜드를 검색하기 위한 Method 입니다.

## 시그니처

```csharp
StdCustomResult<List<CommonBrandInfo>> SearchBrand(string keyword)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `keyword` | String | Y | Max 50 | 검색 키워드 | Nike |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `M_B_NO` | String | 브랜드 번호 |
| &nbsp;&nbsp;↳ `M_B_NM` | String | 브랜드 이름 |
| &nbsp;&nbsp;↳ `M_B_NM_EN` | String | 브랜드 영문이름 |

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

- 서비스 그룹 `CommonInfoLookup` (10011) — 카테고리/브랜드/제조사 등 공통 마스터 조회. 같은 그룹: [`GetCatagoryListAll`](./GetCatagoryListAll.md), [`SearchMaker`](./SearchMaker.md).
- `keyword`는 부분일치 추정 (미검증 — 호출 결과로 검증 필요). 일본어/영어 모두 가능 (예: `Nike`).
- 응답은 리스트 — 동일 키워드에 여러 브랜드가 매칭될 수 있음. 상품 등록 시 `M_B_NO`(브랜드 번호)를 [`SetNewGoods`](../items/SetNewGoods.md) 의 `BrandNo`에 매핑.
- `M_B_NM_EN`은 일본어 브랜드라도 영문 표기가 제공될 수 있음. 다국어 표시에 활용.
- 키워드 미입력/너무 짧은 경우의 동작 미명시 (미검증). 키워드 검증은 클라이언트에서 선처리 권장.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
