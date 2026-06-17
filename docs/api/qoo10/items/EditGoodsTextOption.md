# EditGoodsTextOption — 텍스트 옵션 수정

## 메타

- **메서드명**: `EditGoodsTextOption`
- **서비스**: `ItemsOptions` (상품 옵션 정보 수정)
- **클래스**: `GoodsOptionsBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsOptionsBiz`)
- **m_no / c_no**: 10017 / 10005
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/10017_info.json`, `_raw/10017_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

텍스트 옵션 정보를 수정하는 Method입니다.

*정보수정 시 상품페이지 반영까지 최대 10분이 소요될 수 있습니다.

## 시그니처

```csharp
StdResult EditGoodsTextOption(string ItemCode, string SellerCode, string TextOptions)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `ItemCode` | String | Y | 9 | 등록된 상품의 Qoo10 상품 코드 숫자 | 1234567890 |
| `SellerCode` | String | N | Max 100 | 판매자가 관리하고 있는 상품의 코드입니다. 상품등록 후 해당 정보를 이용해 등록된 상품을 정보를 조회하거나 수정하실 수 있습니다.  | A12345b |
| `TextOptions` | String | N | Text: Max 20, Code : Max 20 | 텍스트 옵션 설정 구매자가 옵션 선택 시, 텍스트 형식으로 입력 가능하도록 옵션을 설정합니다.  입력형식 :열구분자(\|\|*), 행구분자($$) -->[옵션명1]\|\|*1$$[옵션명2]\|\|*2$$[옵션명3]\|\|*3 | [オプション名1]\|\|*1$$[オプション名2]\|\|*2$$[オプション名3]\|\|*3 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | Int32 | API 호출 결과 코드 (성공=0, 실패=-999, -990, -101…etc) |
| `ResultMsg` | String | 성공 및 실패 사유  |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Fail to find Item information with 'ItemCode','SellerCode'. |
| -10101 | Processing Error - [Error Message] |
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsOptions` (10005) — **텍스트형 옵션 전용** (구매자 텍스트 입력형). 단일형은 [`EditGoodsOption`](./EditGoodsOption.md), 조합형은 [`EditGoodsInventory`](./EditGoodsInventory.md).
- `TextOptions` 포맷 — 열구분자 `||*`, 행구분자 `$$`: `[옵션명]||*[옵션상세코드]$$...`. 옵션상세코드 1~3개.
- 글자 수 제한 — 옵션명 Text **최대 20자**, 옵션상세코드 **최대 20자** (단일형/조합형의 50자보다 짧음).
- **전체 재설정** — 기존 텍스트 옵션을 모두 대체. 부분 갱신 불가.
- 상품페이지 반영까지 **최대 10분 지연**.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
