# EditMoveGoodsStatus — MOVE거래상태 변경

## 메타

- **메서드명**: `EditMoveGoodsStatus`
- **서비스**: `ItemsBasic` (상품 정보 등록 & 수정)
- **클래스**: `GoodsBasicBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsBasicBiz`)
- **m_no / c_no**: 15764 / 10004
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15764_info.json`, `_raw/15764_params.json`
- **명세서 수록**: 미수록 (미검증) — 사용자 명세서 `Qoo10_QSM_API_명세서.md` 에 본 메서드 없음. 본 문서는 원본 크롤링 기반이며 결정론적 검증 불가.
- **최종 갱신**: 2026-05-22

## 설명

Qoo10에 등록한 MOVE상품의 거래상태를 변경하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9~10 | 등록된 상품의 Qoo10 상품 코드 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | Seller_1234567890 |
| `Status` | String | Y | 1~3 | 상품의 상태정보 변경할 상태에 대한 상태 번호를 입력합니다.  (거래대기=1, 거래가능=2, 거래폐지=3) | 2 |

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
