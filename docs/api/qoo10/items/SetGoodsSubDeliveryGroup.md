# SetGoodsSubDeliveryGroup — 복수 배송비 설정

## 메타

- **메서드명**: `SetGoodsSubDeliveryGroup`
- **서비스**: `ItemsBasic` (상품 정보 등록 & 수정)
- **클래스**: `GoodsBasicBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsBasicBiz`)
- **m_no / c_no**: 10012 / 10004
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10012_info.json`, `_raw/10012_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 상품에 옵션 배송방식을 추가로 설정하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult SetGoodsSubDeliveryGroup(string ItemCode, string SellerCode, string AddSRcode1, string AddSRcode2)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품번호 9~10자리(반각숫자) | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `AddSRcode1` | String | N | 0~2147483647 | 구매자가 주문 시 배송비를 선택할 수 있도록 상품에 추가로 설정하는 배송비 코드 QSM 배송비 관리 메뉴에서 사용할 배송비의 코드를 확인하시길 바랍니다. | 123456 |
| `AddSRcode2` | String | N | 0~2147483647 | 구매자가 주문 시 배송비를 선택할 수 있도록 상품에 추가로 설정하는 배송비 코드 QSM 배송비 관리 메뉴에서 사용할 배송비의 코드를 확인하시길 바랍니다. | 223456 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | API 호출 결과 코드 (성공=0, 실패=-999, -990, -101…etc) |
| `ResultMsg` | String | 실패시 실패 사유 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Fail to find Item information with 'ItemCode','SellerCode'. |
| -10002 | Please check the [AddSRcode1 or AddSRcode2]. |
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 옵션 배송비는 기본 배송비(`ShippingNo`)와 별개로 **추가 선택지**를 제공. 구매자가 주문 시 배송비를 고를 수 있게 함.
- `AddSRcode1`/`AddSRcode2` 모두 N이지만 둘 다 비우면 옵션 배송비 미설정 상태. 한쪽 또는 양쪽만 설정 가능.
- 배송비 코드는 QSM > 배송비 관리에서 확인 (이 API 자체로는 조회 불가).
- **반영 지연**: 최대 10분 — 호출 직후 상품 페이지 검증 시 지연 고려.
- 잘못된 배송비 코드 입력 시 `-10002` 반환.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
