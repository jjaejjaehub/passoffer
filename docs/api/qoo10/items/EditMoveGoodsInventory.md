# EditMoveGoodsInventory — MOVE옵션정보 수정

## 메타

- **메서드명**: `EditMoveGoodsInventory`
- **서비스**: `ItemsOptions` (상품 옵션 정보 수정)
- **클래스**: `GoodsOptionsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOptionsBiz`)
- **m_no / c_no**: 15762 / 10005
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15762_info.json`, `_raw/15762_params.json`
- **명세서 수록**: 미수록 (미검증) — 사용자 명세서 `Qoo10_QSM_API_명세서.md` 에 본 메서드 없음. 본 문서는 원본 크롤링 기반이며 결정론적 검증 불가.
- **최종 갱신**: 2026-05-22

## 설명

등록된 MOVE 상품의 재고를 수정하는 API Method 입니다.
MOVE 판매자만 이용이 가능합니다.

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | string | Y | 9 | 상품코드 (숫자)  예) 1234567890 | 1234567890 |
| `SellerCode` | string | N | MAX 100 | 판매자상품코드 [안내] 판매자상품코드는 판매자 계정별 중복입력이 불가합니다.  최대 100글자  판매자 관리용 상품코드 | A12345b |
| `OptionQty` | string | N | 0 | 옵션조합별 재고수량 사이즈가 있는 경우 옵션명\|\|*사이즈명\|\|*재고수량\|\|*판매자옵션코드$$  사이즈가 없는 경우 옵션명\|\|*재고수량\|\|*판매자옵션코드$$ | 例1)サイズあり ブラック\|\|*S\|\|*200\|\|*BLACK-S 例2)サイズなし ブラック\|\|*200\|\|*BLACK$$ レッド\|\|*200\|\|*RED$$ ブルー\|\|*200\|\|*BLUE |

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
