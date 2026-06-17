# 주문관리 설계 결정사항 (Decisions)

> 본 문서는 **이전 세션에서 확정된 사용자 답변(A~F)** 과
> **사용자 추가 답변 필요 항목(G + PDF 기반 보강 Q1~Q5)** 을 결정론적으로 정리한다.
> 추측·환각·미확정 디폴트는 포함하지 않는다.
> 인용 근거:
> - PLAYAUTO PDF → `playauto-reference.md` (§표기로 인용)
> - Qoo10 API → `docs/api/qoo10/INDEX.md` 하위 .md
> - 기존 OMS 코드 → `apps/server/src/services/*`, `apps/web/src/entities/*`

---

## A. 확정 (재확인 불필요)

### A-1. Canonical Data Model 채택

- **StandardOrder** 엔티티 1개로 전 채널 주문 표준화.
- 채널별 컬럼은 어댑터 입력 단에서 결정론적으로 변환.
- 채택 패턴: **Adapter Pattern + Canonical Data Model + Status Rule Engine**.

### A-2. 상태 모델 — 2축 + 단일 UI enum

- 내부 모델: `fulfillment_status` (10~90) + `claim_status` (0 = 없음 / 카테고리값).
- UI 표시 enum: 2축 조합을 단일 라벨로 표현하는 별도 enum.
- `fulfillment` rank 10~90 **전진만 허용**, 90(판매완료) **불가침** (PDF §6-4 근거).
- PLAYAUTO 13단계 정상 + 11+@ 클레임 매핑 표는 §C에 명기.

### A-3. 옵션3 메타맵 — `ORDER_FIELD_SOURCE`

- 각 필드의 source 분류: `FieldSource = 'api' | 'api_sync' | 'system' | 'master'`.
- 위치: `apps/server/src/services/orders/ORDER_FIELD_SOURCE.ts` (예정).
- 사용처: 인입/동기화 시 어떤 필드를 덮어쓸지 결정론적 판정.

### A-4. 묶음 모델 (b) — bundleNumber만 공유

- 묶음은 별도 테이블 없이 **`orders.bundle_number` 컬럼 공유**로 표현.
- 합포장 = bundle_number 동일 set, 분할 = bundle_number 재할당.
- PDF §6-1 강제분할 제약과 정합: **채널에는 1송장만 전송**.
- 묶음 기준 4개: (a) 수령자 동일, (b) 주소 동일, (c) 배송메모 동일, (d) 송장출력 전 상태 — 환경설정으로 활성/비활성.

### A-5. 운송장 — fill-if-empty + 충돌 플래그

- 채널에서 송장이 들어와도 OMS 기존 송장 있으면 **덮어쓰지 않음**.
- 일치하지 않으면 `tracking_conflict = true` + 알림 큐.
- 자동 해소 규칙은 PDF 미수록 → §G-Q3에서 결정 필요.

### A-6. Qoo10 발송예정일 양방향

- 채널 → OMS: 동기화 시 `EstimatedShippingDate` 수신.
- OMS → 채널: `SetSellerCheckYN_V2` / `SetSellerCheckYNBulk` (DelayType `1~4`).
- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`.

### A-7. 결정론적 변환 원칙

- 채널 → StandardOrder 변환은 **순수 함수 + 룩업 테이블**.
- LLM 호출 / 추론 금지. 채널 응답 키마다 1:1 매핑 또는 명시 fallback.
- Convert 매핑표는 Task #3에서 `CONVERT_RULES.md`로 채널별 작성.

### A-8. 사은품 규칙 모델

- PLAYAUTO §2-13(p.154~155) 모델 채택.
- 분배 모드 enum: `assigned | random | sequential-on-exhaust`.
- 수량 모드 enum: `fixed_n | per_match_n | order_qty_x_n | limited_total_n`.
- 토글 ON일 때만 적용. 자동 트리거 = [출고지시] 전환.

### A-9. 상품명 관리 (name_rules)

- PLAYAUTO §2-12(p.151~153) 모델 채택.
- 필드: `target_site, target_scope, search_text, match_mode, replace_mode, replace_text`.
- `match_mode = partial | exact`, `replace_mode = partial | whole`.

### A-10. 매칭 규칙 모델 (match_rules + auto_match_logs)

- 매칭 키 (PDF §6-2 인용):
  - 옵션 有: `channel_id + channel_item_code + option_name`
  - 옵션 無: `channel_id + channel_item_code + item_title`
- 상태 enum: `auto | manual | edited | failed`.
- 동일 채널 상품코드 규칙 존재 시 **덮어쓰기** (PDF 명시).
- 미매칭 출고지시 시 `default_warehouse_id` 자동 입력.

### A-11. SKU bundleable 플래그

- SKU 단위에 `bundleable: boolean` (단품 강제 단독배송 표시용).
- 묶음 자동 처리 시 `bundleable = false` SKU 포함 묶음은 자동 분할.

### A-12. PLAYAUTO out-of-scope 확인

- 정산/문의/SMS/알림톡/이메일/통계는 OMS 1차 범위 외 (§5B).
- 물류배송 주문 조회(스마일배송/스마트스토어 풀필먼트)는 별도 모듈 후보.

---

## B. 확정 - 코드화 대기

이하 항목은 결정은 완료되었으나 **DB 스키마 / 서비스 / UI 코드** 구현 작업이 남아있음.

| 영역 | 확정 사항 | 산출 위치 (예정) |
|---|---|---|
| StandardOrder 스키마 | 62 컬럼 (이전 세션 도출) | `apps/server/src/db/schema.ts` `orders` |
| order_items | StandardOrder line-item | `apps/server/src/db/schema.ts` `order_items` |
| shipments | 송장 단위 | `apps/server/src/db/schema.ts` `shipments` |
| claims | claim_type/status/관련 주문 | `apps/server/src/db/schema.ts` `claims` |
| order_status_history | 전이 이력 + actor | `apps/server/src/db/schema.ts` `order_status_history` |
| bundles | bundle_number만 사용 (별도 row 없음) | — (A-4) |
| match_rules + auto_match_logs | A-10 | `apps/server/src/db/schema.ts` |
| gift_rules + gift_assignments | A-8 | `apps/server/src/db/schema.ts` |
| name_rules | A-9 | `apps/server/src/db/schema.ts` |
| bundle_criteria_config | A-4 묶음 기준 환경설정 | `apps/server/src/db/schema.ts` |
| dispatch_delay_config | 배송지연 기본 사유 | `apps/server/src/db/schema.ts` |
| channel_capabilities | §G 도출 후 | `apps/web/src/shared/config/channelCapabilities.ts` |
| ORDER_FIELD_SOURCE | A-3 | `apps/server/src/services/orders/` |
| StatusRuleEngine | A-2 2축 규칙 | `apps/server/src/services/orders/` |

---

## C. PLAYAUTO 상태 ↔ OMS StandardOrder 매핑 (PDF §4-1, §4-2 근거)

### C-1. 정상 13단계 → fulfillment_status (10~90)

| PLAYAUTO (PDF) | OMS rank | 비고 |
|---|---|---|
| 결제완료 | 10 | 입금확인 only |
| 신규주문 | 20 | 주문확인 완료 |
| 주문보류 | 25 | 수동 보류 (라벨) |
| 출고대기 | 30 | 송장 미입력 |
| 출고보류 | 35 | 수동 보류 (라벨) |
| 운송장출력 | 40 | 송장 등록 |
| 출고완료 | 50 | 솔루션 내 최종 출고 |
| 배송중 | 60 | 채널로 송장 전송 완료 |
| 배송완료 | 70 | 수취 확인 |
| 구매결정 | 80 | 채널 동기화 자동 전이 |
| 판매완료 | 90 | **수동 only, 불가침** |
| 출고지연 | (라벨) | rank 미부여 — `is_dispatch_delayed: bool` 라벨 처리 |
| 클레임주문 | (라벨) | claim_status로 분리 |

### C-2. 클레임 11+@ → claim_status

| PLAYAUTO (PDF) | claim_status enum |
|---|---|
| 취소요청 | `cancel_requested` |
| 취소완료 | `cancel_done` |
| 반품요청 | `return_requested` |
| 반품진행 | `return_in_progress` |
| 반품회수완료 | `return_collected` |
| 반품완료 | `return_done` |
| 교환요청 | `exchange_requested` |
| 교환진행 | `exchange_in_progress` |
| 교환회수완료 | `exchange_collected` |
| 교환완료 | `exchange_done` |
| 맞교환요청 | `swap_requested` |
| 맞교환완료 | `swap_done` |
| 주문재확인 | `requires_recheck` (이후 동기화 불가) |
| **미수취** | **PDF 미정의 — §G-Q1 결정 필요** |

---

## G. 사용자 추가 답변 필요 항목

> 본 절은 **사용자 답변이 필요한 항목**만 모은다.
> 답변 시 본 문서를 직접 수정(append)하여 확정 사항으로 이관한다.

### G-Q1. 클레임 `미수취` 카테고리 추가 여부

- **컨텍스트**: PLAYAUTO PDF 클레임 11종에 미수취 없음 (§6-5).
- **선택지**:
  - (a) `claim_status.non_receipt` 추가, 채널이 별도 카테고리로 주면 직접 매핑, 없으면 OMS 수동 사용.
  - (b) 미추가, 채널 측 미수취는 `return_requested`로 흡수.
- **결정 근거 필요**: 일본/한국/동남아 채널 중 미수취 별도 상태를 제공하는 곳이 있는가? (Qoo10 ShippingBasic.GetShippingInfo_v3 응답에 별도 코드가 있는지 확인 필요)

### G-Q2. 구매결정 → 판매완료 자동 전환 규칙

- **컨텍스트**: PDF §6-4는 판매완료를 **수동 only**로 정의. PLAYAUTO는 자동 전이 없음.
- **선택지**:
  - (a) PDF 따라 OMS도 판매완료는 100% 수동 (안전).
  - (b) 구매결정 후 N일 경과 시 자동 판매완료 (정산 마감 기준).
- **연관**: 정산 흐름(B의 settlements)과 묶임.

### G-Q3. 운송장 충돌 해소 워크플로우

- **컨텍스트**: A-5에서 `tracking_conflict` 플래그까지만 결정. 이후 액션 미정.
- **선택지** (다중 선택 가능):
  - (a) 사용자 수동 해소 UI만 제공.
  - (b) 자동 룰: 채널 송장 > OMS 송장 우선.
  - (c) 자동 룰: OMS 송장 우선 (이미 전송한 송장 보호).
  - (d) 충돌 발생 시 즉시 알림(슬랙/이메일) + 수동 해소.

### G-Q4. 출고지연 기준값 정량 정의

- **컨텍스트**: PDF §7-4. PLAYAUTO는 "환경설정 기준" 만 언급, 디폴트 없음.
- **선택지**:
  - (a) 결제완료 후 N영업일 (한국 채널 기준 N=3 권장).
  - (b) 신규주문 후 N영업일.
  - (c) 채널별 SLA 따라 차등 (Qoo10/Shopify/Shopee 각각).
- **필요 입력**: 채널별 발송 SLA 정책.

### G-Q5. 묶음 모델 b ↔ 강제분할 정합

- **컨텍스트**: PDF §6-1 "강제분할해도 채널에는 1송장만 전송".
- **확인 필요**: OMS 강제분할 시 동작?
  - (a) PDF 동일 — 채널에는 단일 송장만 전송, OMS 내부적으로만 분할.
  - (b) 부분발송 지원 채널은 분할된 송장 모두 전송 (Shopify 등).
- **연관**: `channel_capabilities.supportsPartialShipment` 플래그 필요.

### G-Q6. channel_capabilities 항목 도출 (Q8)

- **컨텍스트**: A-12 + 5A-2 + G-Q5에서 채널별 능력치 필요성 누적.
- **현재 필요 도출된 플래그**:
  - `supportsAutoSoldOut` — 자동품절 전송 (§5A-2)
  - `supportsPartialShipment` — 부분 발송 (G-Q5)
  - `supportsDispatchDelayPush` — 발송지연 push (PDF: 신세계/위메프2.0 불가)
  - `supportsDispatchDelayUpdate` — 기 입력 발송예정일 수정 (PDF: 모든 채널 불가)
  - `supportsShipmentTrackingPush` — 송장 push
  - `supportsClaimRead` — 클레임 동기화 가능 여부
  - `supportsClaimWrite` — 클레임 처리 push 가능 여부
  - `supportsBundleNumberInPush` — 묶음번호 채널 push 가능 여부
- **사용자 결정 필요**:
  - 위 8개 + 추가로 필요한 채널 능력치 (예: cod/선결제, 다중 결제수단, 다중 통화)?
  - 디폴트(미정의 채널) 값은 `true` / `false` 어느 쪽?

---

## 본 문서 갱신 규칙

- 사용자 답변이 도착하면 G 항목을 **A 또는 B로 이관**하고, 본 문서 하단에 답변 일자를 기록한다.
- 새로운 미정 항목이 발견되면 G에 추가한다.
- 모든 인용은 PDF 페이지/INDEX 경로/코드 파일 경로로 한정한다.
