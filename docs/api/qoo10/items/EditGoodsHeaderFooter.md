# EditGoodsHeaderFooter — 상품상세 헤터,풋터 수정

## 메타

- **메서드명**: `EditGoodsHeaderFooter`
- **서비스**: `ItemsContents` (상품 컨텐츠 정보 수정)
- **클래스**: `GoodsContentsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsContentsBiz`)
- **m_no / c_no**: 10030 / 10007
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10030_info.json`, `_raw/10030_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

상품상세 컨텐츠 영역의 헤더와 풋터를 수정하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult EditGoodsHeaderFooter(string ItemCode, string SellerCode, string EditHeaderYN, string Header, string EditFooterYN, string Footer)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품 코드 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `EditHeaderYN` | String | Y | 1 | 헤더 수정여부 | 修正が必要な場合= Y、必要が無い場合= N |
| `Header` | String | N | Max 2500 | 헤더에 들어가 문자열 상품상세 컨텐츠영역 상단에 노출될 문구입니다. | <img src="https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png"> |
| `EditFooterYN` | String | Y | 1 | 풋터 수정여부 | 修正が必要な場合= Y、必要が無い場合= N |
| `Footer` | String | N | Max 2500 | 풋터에 들어가 문자열 상품상세 컨텐츠영역 하단에 노출될 문구입니다. | <img src="https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png"> |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | API 호출 결과 코드 (성공=0, 실패=-999, -990, -101…etc) |
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
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsContents` (10007) — 본문 영역 수정은 [`EditGoodsContents`](./EditGoodsContents.md) 분리.
- `EditHeaderYN`/`EditFooterYN`은 **Y/N 필수** — 수정 안 할 영역은 `N`으로 명시. `N`이어도 `Header`/`Footer` 빈 문자열로 전송 권장(생략 시 일부 클라이언트 라이브러리에서 파라미터 누락 처리).
- `Header`/`Footer` 각각 **최대 2,500자** — HTML 허용. 본문은 [`EditGoodsContents`](./EditGoodsContents.md)에서 2GB까지 가능하나, 헤더/푸터는 작은 한도이므로 긴 컨텐츠를 본문에 옮길 것.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
