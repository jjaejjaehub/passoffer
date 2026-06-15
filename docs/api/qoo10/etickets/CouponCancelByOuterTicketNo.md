# CouponCancelByOuterTicketNo — 쿠폰취소(외부 쿠폰번호)

## 메타

- **메서드명**: `CouponCancelByOuterTicketNo`
- **서비스**: `ECouponAuth` (E-Coupon 승인 & 취소)
- **클래스**: `ECouponAuthBiz` (`GMKT.INC.Front.QAPIBiz.ECoupon.ECouponAuthBiz`)
- **m_no / c_no**: 10036 / 10010
- **그룹**: E-Ticket 관리
- **원본 크롤링 파일**: `_raw/10036_info.json`, `_raw/10036_params.json`
- **명세서 수록**: 미수록 (미검증) — 사용자 명세서 `Qoo10_QSM_API_명세서.md` 에 본 메서드 없음. 본 문서는 원본 크롤링 기반이며 결정론적 검증 불가.
- **최종 갱신**: 2026-05-22

## 설명

Qoo10에서 판매된 E-티켓에 대한 승인을 취소하기 위한 API 메소드 입니다.(외부쿠폰)

## 시그니처

```csharp
StdCustomResult<GoodsCouponInfo> CouponCancelByOuterTicketNo(string OuterTicketNo)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `OuterTicketNo` | String | N | Max 300 | 외부 E-티켓번호 (Qoo10에서 발급한 E-티켓번호가 아닌, 각 점포에서 발행하여 Qoo10에 등록한 E-티켓번호) |  |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `contr_no` | Int32 | 주문번호 |
| &nbsp;&nbsp;↳ `ItemCode` | String | 등록된 상품의 Qoo10 상품 코드 |
| &nbsp;&nbsp;↳ `SellerCode` | String | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  |
| &nbsp;&nbsp;↳ `ItemTitle` | String | 상품명 |
| &nbsp;&nbsp;↳ `ItemPrice` | Decimal | 상품의 판매가 |
| &nbsp;&nbsp;↳ `Option` | String | 옵션 |
| &nbsp;&nbsp;↳ `Qty` | Int32 | 상품의 수량 |
| &nbsp;&nbsp;↳ `CouponStat` | String | 티켓상태 (NU : 사용가능, UC : 사용완료, EX : 만료) |
| &nbsp;&nbsp;↳ `AuthType` | String | 티켓 발급방식 (W : 방문수령 , C : E-티켓) |
| &nbsp;&nbsp;↳ `CouponUseDt` | String | E-티켓이 사용일자 |
| &nbsp;&nbsp;↳ `UsableSdt` | String | E-티켓 사용가능 시작일(ex.YYYY-MM-DD) |
| &nbsp;&nbsp;↳ `UsableEdt` | String | E-티켓 사용가능 마지막일(ex.YYYY-MM-DD) |
| &nbsp;&nbsp;↳ `Delmemo` | String | 판매자에게 남긴 메모 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
