# EditInventoryImage — 상품 옵션 이미지 수정

## 메타

- **메서드명**: `EditInventoryImage`
- **서비스**: `ItemsContents` (상품 컨텐츠 정보 수정)
- **클래스**: `GoodsContentsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsContentsBiz`)
- **m_no / c_no**: 15784 / 10007
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15784_info.json`, `_raw/15784_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

상품의 옵션 이미지를 수정하기 위한 메서드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult EditInventoryImage(string ItemCode, string SellerCode, string InventoryImage)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 10 | 등록된 상품의 Qoo10 상품 코드 숫자 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `InventoryImage` | String | N | 0 | 여러 옵션이미지를 등록/수정할 수 있습니다.<br> $$ 으로 각각 이미지를 구분<br> 옵션명1\|\|*옵션이미지1\|*이미지URL1$$옵션명2\|\|*옵션이미지2\|*이미지URL2 | Red\|\|*M사이즈\|\|*https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png  |

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
| -10002 | The image URL is not accurate. |
| -10003 | The validity of the item value is not accurate. |
| -10004 | Move items not allowed. |
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsContents` (10007) — 옵션 이미지 전용. 대표 이미지는 [`EditGoodsImage`](./EditGoodsImage.md), 추가/멀티 이미지는 [`EditGoodsMultiImage`](./EditGoodsMultiImage.md), 추가옵션 이미지는 [`EditAdditionalOptionImage`](./EditAdditionalOptionImage.md).
- `InventoryImage` 포맷 — 열구분자 `||*`, 행구분자 `$$`: `[옵션명1]||*[옵션값1]||*[이미지URL1]$$[옵션명2]||*[옵션값2]||*[이미지URL2]...`. **조합형 옵션의 각 SKU 행에 1:1 매칭**되어야 함.
- `-10002` — 이미지 URL이 부정확. HTTPS, 도달 가능, 이미지 컨텐츠 타입 사전 검증 필요.
- `-10003` — 항목 값 유효성 실패. 옵션명/옵션값이 실제 [`EditGoodsInventory`](./EditGoodsInventory.md)에 등록된 조합과 일치해야 함.
- `-10004` — Move items not allowed. 상품이 이동/병합 중인 상태에서 호출하면 거부.
- `ItemCode` 길이 — 명세서는 **10자**로 명시 (다른 메서드는 9자인 경우도 있음). 9~10자리 모두 수용하도록 클라이언트 검증 완화 권장.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
