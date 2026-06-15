# SetClaimAccept — 교환 승인 API

## 메타

- **메서드명**: `SetClaimAccept`
- **서비스**: `Claim` (클레임)
- **클래스**: `ClaimBiz` (`GMKT.INC.Front.QAPIBiz.Claim.ClaimBiz`)
- **m_no / c_no**: 10060 / 10015
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/10060_info.json`, `_raw/10060_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

판매자가 교환을 승인하는 Method입니다.

## 시그니처

```csharp
StdResult SetClaimAccept(string orderNo, string seller_name, string seller_zip_code, string seller_front_address, string seller_back_address, string seller_hp_no, string seller_tel_no)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `orderNo` | String | Y | int | 주문번호 | 110066710 |
| `seller_name` | String | N | Max 200 | 판매자명 | 例：Qoo10ショップ |
| `seller_zip_code` | String | N | Max 10 | 판매자주소 우편번호 | 000-0000 |
| `seller_front_address` | String | N | Max 200 | 앞단 판매자 주소 | OO県OOO市 |
| `seller_back_address` | String | N | Max 200 | 뒷단 판매자 주소 | ０００－００、OOOマンションOOO号室 |
| `seller_hp_no` | String | N | Max 200 | 판매자 휴대폰번호 | 090‐0000-0000 |
| `seller_tel_no` | String | N | Max 200 | 판매자 전화번호 | 0000-00-0000 |

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
| -90001 | The API does not exist |
| -90002 | You are not authorized for this. |
| -90003 | You are not authorized for this. |
| -90004 | Seller authorization key is expired. Use a new key. |
| -90005 | Seller authorization key is expired. Use a new key. |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `Claim` (10015) — `ShippingBasic` / `CSCenter`와 별도 클래스(`ClaimBiz`).
- `seller_*` 7개 필드는 모두 선택 — 미입력 시 채널 설정값 사용 (구체 fallback은 명세서 미명시, 실제 호출로 확인).
- 교환 승인 후 재배송은 [`SetClaimRedelivery`](./SetClaimRedelivery.md)로 진행 — 본 메서드는 교환 의사 수락만.
- `seller_zip_code` 형식 (하이픈 유무, 자릿수)는 일본 우편번호 표준 따르되 채널 측 검증 룰은 명세서 미명시 — 호출 결과로 확인.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
