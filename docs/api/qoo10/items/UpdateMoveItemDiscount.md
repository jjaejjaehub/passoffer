# UpdateMoveItemDiscount — MOVE 기본할인 수정

## 메타

- **메서드명**: `UpdateMoveItemDiscount`
- **서비스**: `ItemsOrder` (상품 가격 & 수량 정보 수정)
- **클래스**: `GoodsOrderBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOrderBiz`)
- **m_no / c_no**: 15765 / 10006
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15765_info.json`, `_raw/15765_params.json`
- **명세서 수록**: 미수록 (미검증) — 사용자 명세서 `Qoo10_QSM_API_명세서.md` 에 본 메서드 없음. 본 문서는 원본 크롤링 기반이며 결정론적 검증 불가.
- **최종 갱신**: 2026-05-22

## 설명

등록한 MOVE 상품에 할인을 설정/수정하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 MOVE 상품의 Qoo10 상품 코드 숫자 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `BeginDate` | String | N | 10 | 할인 시작일(YYYY-MM-DD) | 2025-06-01 |
| `EndDate` | String | N | 10 | 할인 종료일(YYYY-MM-DD) | 2025-05-31 |
| `CostPrice` | String | N | Max 999999999 | 할인 금액(type1: 1~49%, type2: 0~999999999) | 10 |
| `DiscountType` | String | Y | 1 | 할인 타입 (할인없음=0, 정률할인=1, 정액할인=2) | 1 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

_없음_

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
