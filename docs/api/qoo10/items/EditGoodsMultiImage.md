# EditGoodsMultiImage — 멀티 이미지 수정

## 메타

- **메서드명**: `EditGoodsMultiImage`
- **서비스**: `ItemsContents` (상품 컨텐츠 정보 수정)
- **클래스**: `GoodsContentsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsContentsBiz`)
- **m_no / c_no**: 10029 / 10007
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10029_info.json`, `_raw/10029_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

상품의 멀티 이미지를 수정하는 Method 입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

업데이트 안내

-멀티이미지 설정 최대 50개까지 가능하도록 확대

## 시그니처

```csharp
StdResult EditGoodsMultiImage(string ItemCode, string SellerCode, string EnlargedImage1, string EnlargedImage2, string EnlargedImage3, string EnlargedImage4, string EnlargedImage5, string EnlargedImage6, string EnlargedImage7, string EnlargedImage8, string EnlargedImage9, string EnlargedImage10, string EnlargedImage11)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품 코드 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `EnlargedImage1` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png$$ https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png  |
| `EnlargedImage2` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png$$ https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png |
| `EnlargedImage3` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage4` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage5` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage6` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage7` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage8` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage9` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage10` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage11` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage12` | String | N | Max 200 | 멀티 이미지 URL 컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage13` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage14` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage15` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage16` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage17` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage18` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage19` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage20` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage21` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage22` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage23` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage24` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage25` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage26` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage27` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage28` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage29` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage30` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage31` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage32` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage33` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage34` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage35` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage36` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage37` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage38` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage39` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage40` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage41` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage42` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage43` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage44` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage45` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage46` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage47` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage48` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage49` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |
| `EnlargedImage50` | String | N | Max 200 | 멀티 이미지 URL컨텐츠 영역에 노출됩니다. |  |

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
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsContents` (10007) — 추가/멀티 이미지 수정 전용 (대표 이미지는 [`EditGoodsImage`](./EditGoodsImage.md)).
- **시그니처 불일치 주의** — C# 시그니처에는 `EnlargedImage1~11`까지만 명시되어 있으나 사용자 명세서 파라미터 표는 **`EnlargedImage1~50`까지 50개** 정의됨. 업데이트 안내에 "멀티이미지 설정 최대 50개까지 가능하도록 확대" 명시되어 있으므로 12번 이후도 호출 가능. 12번 이후는 동적 쿼리스트링 빌더로 전송.
- 각 `EnlargedImage` URL 최대 **200자** — 초과 시 단축 URL 또는 호스팅 재배치.
- 이미지 URL은 Qoo10 호스팅(`dp.image-qoo10.jp`) 권장 — 외부 URL은 일부 케이스에서 거부될 수 있음 ([`EditGoodsImage`](./EditGoodsImage.md) 참조).
- 비워둘 슬롯은 빈 문자열 전송 — 슬롯 파라미터 자체를 누락하면 일부 클라이언트 라이브러리에서 정상 호출 처리 안 됨.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
