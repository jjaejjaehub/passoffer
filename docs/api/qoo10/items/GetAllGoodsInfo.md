# GetAllGoodsInfo — 전체상품 조회

## 메타

- **메서드명**: `GetAllGoodsInfo`
- **서비스**: `ItemsLookup` (상품 정보 조회)
- **클래스**: `GoodsLookupBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsLookupBiz`)
- **m_no / c_no**: 10008 / 10003
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10008_info.json`, `_raw/10008_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

상품거래상태를 기준으로 판매자가 등록한 상품전체를 조회하기 위한 API 메소드입니다. 

(한페이지에 최대 500개까지 상품이 조회되며, 페이지로 구분하여 조회할 수 있습니다.)

## 시그니처

```csharp
StdCustomResult<AllGoodsInfo> GetAllGoodsInfo(string ItemStatus, string Page)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemStatus` | String | Y | 0 | 상품의 거래 상태 (검수대기=S0, 거래대기=S1, 거래가능=S2, 거래중지(Qoo10)=S3, 거래제한(Qoo10)=S5, 승인거부=S8) | S0 |
| `Page` | String | N | 0~2147483647 | 페이지번호 (입력하지 않을 경우 1페이지 조회) | 1 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `TotalItems` | Int32 | 전체 상품 수 |
| &nbsp;&nbsp;↳ `TotalPages` | Int32 | 전체 페이지 수 |
| &nbsp;&nbsp;↳ `PresentPage` | Int32 | 현재 페이지 번호 |
| &nbsp;&nbsp;↳ `Items` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `ItemCode` | String | 등록된 상품의 Qoo10 상품 코드 |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `SellerCode` | String | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `ItemStatus` | String | 상품의 거래 상태 (검수대기=S0, 거래대기=S1, 거래가능=S2, 거래중지(Qoo10)=S3, 거래제한(Qoo10)=S5, 승인거부=S8) |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | Success |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Please enter the correct ItemStatus. (S0/S1/S2/S4) |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsLookup` (10003) — 상품 목록 조회. 같은 그룹: [`GetItemDetailInfo`](./GetItemDetailInfo.md), [`GetGoodsOptionInfo`](./GetGoodsOptionInfo.md), [`GetGoodsInventoryInfo`](./GetGoodsInventoryInfo.md), [`GetSellerDeliveryGroupInfo`](./GetSellerDeliveryGroupInfo.md).
- **페이지당 최대 500개** — `TotalPages`만큼 클라이언트에서 순회 호출 필요. 동기화 시 페이지 단위 청크로 처리.
- **`ItemStatus` enum 불일치** — 요청 표는 `S0`/`S1`/`S2`/`S3`/`S5`/`S8` (6종) 명시이나 Result Codes의 `-10001` 메시지는 `S0`/`S1`/`S2`/`S4` (Discontinued)만 허용으로 안내. 실제 허용 값은 호출 검증 필요 (미검증).
- 응답 `Items` 하위는 `ItemCode`/`SellerCode`/`ItemStatus` 3개 뿐 — 상세 정보는 [`GetItemDetailInfo`](./GetItemDetailInfo.md) 후속 호출, 재고는 [`GetGoodsInventoryInfo`](./GetGoodsInventoryInfo.md).
- `Page` 미입력 시 1페이지 반환. 타입은 String이지만 숫자 문자열만 허용 (`0~2147483647`).
- 전체 동기화 패턴: `S2`(거래가능) 우선 조회 → 페이지 순회 → 라인별 상세 호출. 다른 상태는 별도 잡으로 분리 권장.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
