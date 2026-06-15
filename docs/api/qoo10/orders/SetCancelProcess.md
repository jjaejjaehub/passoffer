# SetCancelProcess — 주문 번호로 취소

## 메타

- **메서드명**: `SetCancelProcess`
- **서비스**: `Claim` (클레임)
- **클래스**: `ClaimBiz` (`GMKT.INC.Front.QAPIBiz.Claim.ClaimBiz`)
- **m_no / c_no**: 10059 / 10015
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/10059_info.json`, `_raw/10059_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

주문 번호로 취소할 수 있는 Method입니다.

## 시그니처

```csharp
StdResult SetCancelProcess(string ContrNo, string CancelReason, string SellerMemo, string returnFeeStat)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ContrNo` | String | Y | int | 주문번호 | 110000000 |
| `CancelReason` | String | N | 1 | 판매자의 주문취소 사유 (입력하지 아니한경우 "재고 없음"으로 처리)<br/> 미입력:재고 없음(판매자 사유) <br/> 1:주문 변경 <br/> 2:배송 불가 지역(판매자 사유) <br/> 3:배송 지연(판매자 사유) <br/> * 구입자에 의한 주문 취소사유 업데이트 하지 않습니다. | 3 |
| `SellerMemo` | String | N | Max 1000 | 판매자 메모 | 不在の場合は管理室に預けてください。 |
| `returnFeeStat` | string | N | 0 | 반품 배송비(현재 사용하지 않는 항목입니다) | 現在使用しない項目です |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | 결과코드 |
| `ResultMsg` | String | 결과메시지 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | 주문번호가 잘못되었습니다. |
| -10002 | 주문정보가 없습니다. |
| -10003 | 판매자정보가 올바르지 않습니다. |
| -10004 | 주문상태가 올바르지 않습니다. |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `Claim` (10015) — `ShippingBasic` / `CSCenter`와 별도 클래스(`ClaimBiz`).
- `CancelReason` 미입력 시 자동 "재고 없음(판매자 사유)" 처리 — 사유 미선택 케이스 UI에서 미리 경고.
- 구매자 사유 주문 취소는 본 메서드로 업데이트 되지 않음 — 구매자 측 취소는 `GetClaimInfo_V3` 폴링으로 감지.
- `returnFeeStat`는 현재 미사용 항목 — 빈 문자열로 전송.
- `-10004` 주문상태 오류는 이미 발송/취소 완료된 주문 — `GetShippingInfo_v3`로 사전 상태 확인 권장.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
