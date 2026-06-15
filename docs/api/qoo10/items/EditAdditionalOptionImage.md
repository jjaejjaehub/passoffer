# EditAdditionalOptionImage — 상품 추가구성 이미지 수정

## 메타

- **메서드명**: `EditAdditionalOptionImage`
- **서비스**: `ItemsContents` (상품 컨텐츠 정보 수정)
- **클래스**: `GoodsContentsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsContentsBiz`)
- **m_no / c_no**: 15783 / 10007
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15783_info.json`, `_raw/15783_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

상품의 추가 구성 이미지를 수정하기 위한 메서드입니다.

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 10 | 등록된 상품의 Qoo10 상품번호 9~10자리(반각숫자) | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `AdditionalOptionImage` | String | N | 0 | 여러 추가구성이미지를 등록/수정할 수 있습니다.<br> $$ 으로 각각 이미지를 구분<br> 옵션명1\|\|*옵션이미지1\|*이미지URL1$$옵션명2\|\|*옵션이미지2\|*이미지URL2 | 건전지\|\|*4개셋\|\|*https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | API 호출 결과 코드 (성공=0, 실패=-10000, -10001, -10002…etc) |
| `ResultMsg` | String | 성공 및 실패 사유  |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Fail to find Item information with 'ItemCode','SellerCode'. |
| -10002 | Incorrect image url. |
| -10003 | 항목명/항목값/이미지url 유효성오류 (ex. `Color\|\|*Red`, `Color\|\|*Red\|\|*Size\|\|*L`) |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- `AdditionalOptionImage` 포맷 — **열구분자 `||*`, 행구분자 `$$`**: `옵션명1||*옵션값1||*이미지URL1$$옵션명2||*옵션값2||*이미지URL2`.
- 사용자 명세서 본문에 `||*옵션이미지1|*이미지URL1` 단축 표기가 있으나 실제 spec은 `||*` 일관 사용 — 코드 작성 시 `||*`로 통일.
- 이미지 URL은 Qoo10 호스팅(`dp.image-qoo10.jp`) 권장. 외부 URL 시 `-10002` 발생 가능.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
