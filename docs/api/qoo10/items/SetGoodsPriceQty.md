# SetGoodsPriceQty — 판매가격/재고수량/판매종료일수정

## 메타

- **메서드명**: `SetGoodsPriceQty`
- **서비스**: `ItemsOrder` (상품 가격 & 수량 정보 수정)
- **클래스**: `GoodsOrderBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOrderBiz`)
- **m_no / c_no**: 10024 / 10006
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10024_info.json`, `_raw/10024_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 상품의 가격, 수량, 판매기한을 수정하는 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult SetGoodsPriceQty(string ItemCode, string SellerCode, string Price, int Qty, string ExpireDate)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품번호 9~10자리(반각숫자) | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `Price` | String | N | 1~999999999 | 상품가격 (생략가능) | 10000 |
| `TaxRate` | String | N | 2 | 소비세율 </br> S, 10, 8, 0 중에 선택하여 입력 </br> </br> S : 판매점 기본설정 소비세 적용 </br> 10 : 소비세율 10% 적용 </br> 8 : 소비세율 8% 적용 </br> 0 : 소비세율 0% 적용 | 10 |
| `Qty` | string | N | 0~2147483647 | 상품의 수량 | 200 |
| `ExpireDate` | String | N | 10 | 상품 판매 종료 (yyyy-mm-dd) 형식으로 입력 하시갈바랍니다. Null 로입력 시 1년 후로 설정됩니다 | 2030-12-31 |

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

- **신규 서비스 그룹** `ItemsOrder` (10006) — 상품 가격 & 수량 정보 수정. INDEX.md에 추가 필요. [`EditGoodsOrderLimit`](./EditGoodsOrderLimit.md)도 같은 그룹.
- **모든 필드 선택적** — `ItemCode`만 필수. 미입력 필드는 갱신 제외 (생략하면 기존값 유지로 추정, 단 `ExpireDate` Null 시 1년 후로 강제 변경됨).
- `Price` — String이지만 숫자만 허용. 1~999,999,999. **옵션가 -50%~+50% 제약은 본 상품가 기준이므로 가격 변경 시 옵션 가격 재검증 필요**.
- `TaxRate` — `S` / `10` / `8` / `0`. 시그니처에는 누락되어 있으나 파라미터 표에는 존재 (시그니처 절단). 어댑터 호출 시 명시 전달.
- `Qty` — 본 상품 수량 (옵션 합계가 아닌 단일 SKU 상품). 옵션 상품은 `EditGoodsInventory`/`EditCommonGoodsInventory` 사용.
- `ExpireDate` — `yyyy-mm-dd`. **Null 입력 시 자동 1년 연장** (의도치 않은 연장 주의 — 호출 측에서 의도적으로 Null을 보내지 말 것).
- 상품페이지 반영까지 **최대 10분 지연**.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
