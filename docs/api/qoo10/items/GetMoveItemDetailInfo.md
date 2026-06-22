# GetMoveItemDetailInfo — MOVE 상품 상세 정보 조회

## 메타

- **메서드명**: `GetMoveItemDetailInfo`
- **서비스**: `ItemsLookup` (상품 정보 조회)
- **클래스**: `GoodsLookupBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsLookupBiz`)
- **m_no / c_no**: 15761 / 10003
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15761_info.json`, `_raw/15761_params.json`
- **명세서 수록**: 미수록 (미검증) — 사용자 명세서 `Qoo10_QSM_API_명세서.md` 에 본 메서드 없음. 본 문서는 원본 크롤링 기반이며 결정론적 검증 불가.
- **최종 갱신**: 2026-06-11

> ⚠️ **미검증** — MOVE 전용 API로 일반 판매자 계정으로 호출 불가. 응답 필드는 원본 크롤링에 비어 있어 [`GetItemDetailInfo`](./GetItemDetailInfo.md) 와 유사한 구조로 추정. 실제 호출 결과로 검증 필요.

## 설명

MOVE 상품코드를 입력하여 단일상품의 상세 정보를 조회하는 API Method 입니다.
MOVE 판매자만 이용이 가능합니다.

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | string | Y | 9 | 상품코드 (숫자)  예) 1234567890 | 1234567890 |
| `SellerCode` | string | N | MAX 100 | 판매자상품코드 [안내] 판매자상품코드는 판매자 계정별 중복입력이 불가합니다.  최대 100글자  판매자 관리용 상품코드 | A12345b |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

_없음_

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- ⚠️ **사용자 명세서 미수록 — 호출 가능 여부 자체가 검증 안 됨**. MOVE 판매자 계정이 없으면 어댑터 구현 보류.
- MOVE는 Qoo10 일본의 특수 판매자 프로그램 (사전 등록 필요). 일반 `ItemsLookup` 그룹과 동일 c_no(10003) 사용하나 권한 분리.
- 명세서가 갱신되면 [`GetItemDetailInfo`](./GetItemDetailInfo.md) 와 동일 패턴으로 응답 필드 표 갱신 필요.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
