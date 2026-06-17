# InsertInventoryDataUnit — 조합형 옵션 개별 등록

## 메타

- **메서드명**: `InsertInventoryDataUnit`
- **서비스**: `ItemsOptions` (상품 옵션 정보 수정)
- **클래스**: `GoodsOptionsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOptionsBiz`)
- **m_no / c_no**: 10020 / 10005
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10020_info.json`, `_raw/10020_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 상품의 조합형 옵션정보를 추가 등록하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult InsertInventoryDataUnit(string ItemCode, string SellerCode, string OptionName, string OptionValue, string OptionCode, Decimal Price, int Qty)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품 코드 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `OptionName` | String | Y | Max 50 | 옵션명 | カラー、サイズ |
| `OptionValue` | String | Y | Max 50 | 옵션값 | RED,S,M,L |
| `OptionCode` | String | N | Max 50 | 옵션코드 | Red_S |
| `Price` | Decimal | N | 1~999999999 | 옵션가격<br> *옵션가격은 판매가격에 -50%~50%이며 0엔인 선택지가 1개이상 필요합니다.  | 5000 |
| `Qty` | Int32 | N | 0~2147483647 | 옵션 수량 | 100 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | API 호출 결과 코드 (성공=0, 실패=-999, -990, -101…etc) |
| `ResultMsg` | String |  성공 및 실패 사유 |

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

- 서비스 그룹 `ItemsOptions` (10005) — **조합형 옵션 단건 등록**. 대량 등록은 [`InsertInventoryDataBulk`](./InsertInventoryDataBulk.md), 수정은 [`EditGoodsInventory`](./EditGoodsInventory.md), 단건 삭제는 [`DeleteInventoryDataUnit`](./DeleteInventoryDataUnit.md).
- `OptionName` / `OptionValue` — **다축 결합 시 `,` 구분자** (예: `"カラー、サイズ"`, `"RED,S,M,L"`). 단축 옵션은 단일 문자열. 명세서는 콤마(`,`) 구분자를 사용하나, 다른 메서드는 `||*` 사용 — 어댑터 구현 시 어느 쪽이 실 통용인지 검증 필요 (미검증).
- `OptionCode` — 옵션의 SKU 식별자. SellerCode와 별개로 옵션 단위 매핑에 사용. 최대 50자.
- **옵션가격 제약** — 본 상품 판매가의 -50%~+50% + **0엔 선택지 1개 이상 필수** (전체 옵션 통틀어). 단건 등록이라도 이 제약은 상품 전체 기준.
- `Qty` 누락 시 기본 0. `Price` 누락 시 본 상품가 사용 추정 (미검증).
- 상품페이지 반영까지 **최대 10분 지연**.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
