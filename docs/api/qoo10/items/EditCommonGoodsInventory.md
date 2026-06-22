# EditCommonGoodsInventory — 옵션정보 수정(공통)

## 메타

- **메서드명**: `EditCommonGoodsInventory`
- **서비스**: `ItemsOptions` (상품 옵션 정보 수정)
- **클래스**: `GoodsOptionsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOptionsBiz`)
- **m_no / c_no**: 15763 / 10005
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15763_info.json`, `_raw/15763_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

일반 상품의 조합형옵션정보의 옵션별 수량항목과 MOVE 상품의 수량을 함께 수정하기 위한 API 메소드입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `SellerCode` | String | Y | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `InventoryInfo` | String | N | Option: Max 50 | 조합형 옵션 정보 옵션별로 가격 및 재고 정보가 있는 조합형 옵션을 설정합니다. 입력형식 :열구분자(\|\|*), 행구분자($$) -->[옵션명]\|\|*[옵션상세1]\|\|*[가격]\|\|*[수량]\|\|*[옵션코드]$$[옵션명]\|\|*[옵션상세2]\|\|*[가격]\|\|*[수량]\|\|*[옵션코드]  | 例：マウス1の価格が100円で在庫数が10個、マウス2の価格が200円で在庫が20個。ex）&InventoryInfo =マウス\|\|*マウス1\|\|*100\|\|*10\|\|*M1$$マウス\|\|*マウス2\|\|*100\|\|*10\|\|*M2 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

_없음_

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

> 사용자 명세서에 별도 Result Codes 표 미포함. 공통 코드(`-10000`/`-10001`/`-90001~-90005`)는 [`common/conventions.md`](../common/conventions.md) 참조.

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 일반 상품과 MOVE 상품의 **수량 동시 수정 전용**. 옵션 *추가/삭제*는 [`EditGoodsOption`](./EditGoodsOption.md) / [`DeleteInventoryDataUnit`](./DeleteInventoryDataUnit.md).
- `InventoryInfo` 포맷 — 열구분자 `||*`, 행구분자 `$$`: `[옵션명]||*[옵션상세]||*[가격]||*[수량]||*[옵션코드]`.
- `SellerCode`가 `Y` 필수 — Qoo10 `ItemCode`만으로는 호출 불가. 판매자 코드 없는 레거시 상품은 [`EditGoodsInventory`](./EditGoodsInventory.md) 사용.
- 응답 본문 비어있을 수 있음 — HTTP 200만 확인 후 후속 조회로 반영 검증 권장.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
