# EditGoodsImage — 메인 이미지 수정

## 메타

- **메서드명**: `EditGoodsImage`
- **서비스**: `ItemsContents` (상품 컨텐츠 정보 수정)
- **클래스**: `GoodsContentsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsContentsBiz`)
- **m_no / c_no**: 10028 / 10007
- **그룹**: 상품 관리
- **버전**: 1.1
- **원본 크롤링 파일**: `_raw/10028_info.json`, `_raw/10028_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 상품의 메인 이미지를 수정하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult EditGoodsImage(string ItemCode, string SellerCode, string StandardImage)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품 코드 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `StandardImage` | String | Y | Max 200 | 이미지 URL 상품의 메인이미지로 노출됩니다. | https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png |
| `VideoURL` | String | N | Max 200 | 동영상 URL | https://www.youtube.com/watch?v=Zhl4N5vd7NE |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | API 호출 결과 코드 (성공=0, 실패=-999, -990, -101…etc) |
| `ResultMsg` | String | 성공 및 실패 사유 |

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
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsContents` (10007) — 메인 대표 이미지 + 동영상 URL 수정 전용.
- `StandardImage` URL은 Qoo10 호스팅(`dp.image-qoo10.jp`) 권장 — 외부 URL은 `-10002 Incorrect image url` 발생 가능.
- `VideoURL`은 YouTube 외 다른 호스팅 미검증. 사용자 명세서 예시는 `youtube.com/watch?v=...` 풀 URL.
- 멀티 이미지(추가 이미지) 등록은 [`EditGoodsMultiImage`](./EditGoodsMultiImage.md) 별도 호출.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
