# EditGoodsInventory — 옵션정보 수정

## 메타

- **메서드명**: `EditGoodsInventory`
- **서비스**: `ItemsOptions` (상품 옵션 정보 수정)
- **클래스**: `GoodsOptionsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOptionsBiz`)
- **m_no / c_no**: 10018 / 10005
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10018_info.json`, `_raw/10018_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 상품의 조합형 옵션정보를 설정 및 수정하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult EditGoodsInventory(string ItemCode, string SellerCode, string InventoryInfo)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품 코드 숫자 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `InventoryInfo` | String | N | Option: Max 50 | 조합형 옵션 정보 옵션별로 가격 및 재고 정보가 있는 조합형 옵션을 설정합니다. 입력형식 :열구분자(\|\|*), 행구분자($$) -->[옵션명]\|\|*[옵션상세1]\|\|*[가격]\|\|*[수량]\|\|*[옵션코드]$$[옵션명]\|\|*[옵션상세2]\|\|*[가격]\|\|*[수량]\|\|*[옵션코드] 예시: 옵션으로 마우스를 설정 시 마우스1의 가격이 100이고 재고수량이 10개인 경우와  마우스2의 가격이 200이며 재고가 20인 경우  ex)&InventoryInfo=마우스\|\|*마우스1\|\|*100\|\|*10\|\|*0$$마우스\|\|*마우스2\|\|*200\|\|*<br> *옵션가격은 판매가격에 -50%~50%이며 0엔인 선택지가 1개이상 필요합니다.   | color\|\|*red\|\|*0\|\|*10\|\|*red-1$$color\|\|*blue\|\|*500\|\|*15\|\|*blue-1 |

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
| -10002 | Check Inventory Data Format (Name\|\|*Value\|\|*Price\|\|*Qty\|\|*OptioCode$$) |
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsOptions` (10005) — 조합형 옵션 **전체 재설정** (수량만 수정은 [`EditCommonGoodsInventory`](./EditCommonGoodsInventory.md), 단건 삭제는 [`DeleteInventoryDataUnit`](./DeleteInventoryDataUnit.md)).
- `InventoryInfo` 포맷 — 열구분자 `||*`, 행구분자 `$$`: `[옵션명]||*[옵션값]||*[가격]||*[수량]||*[옵션코드]`. 포맷 오류 시 `-10002`.
- **옵션가격 제약** — 본 상품 판매가의 -50%~+50% 범위 + **0엔 선택지가 1개 이상 필수**. 모든 옵션이 +가격이면 거부됨.
- 옵션명/옵션값 각 최대 50자.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
