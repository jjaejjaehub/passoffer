# EditGoodsOrderLimit — 구매수량제한 수정

## 메타

- **메서드명**: `EditGoodsOrderLimit`
- **서비스**: `ItemsOrder` (상품 가격 & 수량 정보 수정)
- **클래스**: `GoodsOrderBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOrderBiz`)
- **m_no / c_no**: 10026 / 10006
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10026_info.json`, `_raw/10026_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

상품에 구매 가능 수량을 설정하는 Method 입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult EditGoodsOrderLimit(string ItemCode, string SellerCode, string LimitType, string LimitCnt, string EndDate)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | Qoo10 상품코드 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자 상품코드 | abc_1234 |
| `LimitType` | String | N | 10 | 제한 타입 (0: 1회 제한수량, 1: 1인 제한 수량) | 1 |
| `LimitCnt` | String | N | 0~99 | 제한 수량 | 10 |
| `EndDate` | String | N | 10 | 판매종료일 YYYY-MM-DD | 2025-12-31 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | 결과 코드 |
| `ResultMsg` | String | 결과 메세지 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Fail to find Item information with 'ItemCode','SellerCode'. |
| -10002 | Please input LimitCnt. |
| -10003 | It allows to input limit quantity up to 50(qty). |
| -10004 | Please enter number(0 or 1) only [Limit Type]. |
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- **신규 서비스 그룹** `ItemsOrder` (10006) — 상품 가격 & 수량 정보 수정. INDEX.md에 별도 그룹 추가 필요.
- `LimitType` 은 **`0` 또는 `1` 문자열만 허용** — 그 외 입력은 `-10004`. (0 = 1회 주문당 제한, 1 = 1인 누적 제한)
- `LimitCnt` — 파라미터 표는 `0~99`로 명시되나 **Result Code `-10003`은 "최대 50qty까지"** 라고 응답함. 실 한도는 **50**으로 가정하고 클라이언트 검증 적용. 누락 시 `-10003`이 아니라 `-10002`.
- `EndDate` 포맷은 `YYYY-MM-DD` (10자) — 명세서 파라미터 표에 등장하나 시그니처에는 없는 경우가 있음. 동적 쿼리스트링 빌더로 전송.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
