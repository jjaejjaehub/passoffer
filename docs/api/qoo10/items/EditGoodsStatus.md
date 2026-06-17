# EditGoodsStatus — 거래상태 변경

## 메타

- **메서드명**: `EditGoodsStatus`
- **서비스**: `ItemsBasic` (상품 정보 등록 & 수정)
- **클래스**: `GoodsBasicBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsBasicBiz`)
- **m_no / c_no**: 10013 / 10004
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10013_info.json`, `_raw/10013_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 등록한 상품의 거래상태를 변경하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult EditGoodsStatus(string ItemCode, string SellerCode, string Status)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품번호 9~10자리(반각숫자) | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `Status` | String | Y | 1~3 | 상품의 상태정보 변경할 상태에 대한 상태 번호를 입력합니다.  (거래대기=1, 거래가능=2, 거래폐지=3) | 2 |

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
| -10002 | The Item is currently Under review. |
| -10003 | The Item is currently Suspended. |
| -10004 | The Item is currently Restrict. |
| -10005 | The Item is currently Rejected. |
| -10006 | Please input the right status of the Item. (1,2,3 only) |
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- **신규 서비스 그룹** `ItemsBasic` — 상품 정보 등록 & 수정. INDEX.md에 추가 필요.
- `Status` 값은 **`1` / `2` / `3` 문자열만 허용** — 그 외 입력은 `-10006`.
  - `1` = 거래대기, `2` = 거래가능, `3` = 거래폐지
- **차단 상태**: 검수중(`-10002`) / 일시중지(`-10003`) / 제한(`-10004`) / 거부(`-10005`) 상태의 상품은 거래상태를 바꿀 수 없음 — Qoo10 측 운영 액션이 선행되어야 함.
- 마스터 상품 → Qoo10 리스팅의 "판매 일시중지" 토글은 거래대기(1) ↔ 거래가능(2) 전환으로 매핑. 거래폐지(3)는 비가역에 가까우므로 별도 확인 UI 필요.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
