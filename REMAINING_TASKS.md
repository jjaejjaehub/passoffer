# 남은 작업 목록

> 마지막 업데이트: 2026-04-28

---

## 1. 미구현 기능 — 완료

| 우선순위 | 파일 | 위치 | 작업 내용 | 상태 |
|----------|------|------|-----------|------|
| 높음 | `shopifyReturnMutations.ts` | — | Shopify 반품 거절 구현 | ✅ 완료 |
| 높음 | `shopifyReturnMutations.ts` | — | Shopify 반품 환불 구현 | ✅ 완료 |
| 중간 | `shopifyOrderMutations.ts` | — | Shopify 주문 메모 수정 구현 | ✅ 완료 |
| 중간 | `ClaimsPage.tsx` | — | 클레임 관리 UI 연동 | ✅ 완료 (ShopifyReturnDetailModal 이미 구현됨) |

---

## 2. 인프라 / 모니터링

| 우선순위 | 파일 | 위치 | 작업 내용 |
|----------|------|------|-----------|
| 낮음 | `apps/web/src/shared/lib/errorReporter.ts` | L24 | Sentry 에러 리포터 연동 (`SENTRY_DSN` env + `@sentry/nextjs` 설치 필요) |

---

## 3. InventoryOptionSection 안정화

| 우선순위 | 항목 | 상태 | 비고 |
|----------|------|------|------|
| 중간 | 중복 key 전략 | ✅ 완료 | `getInventoryItemId`가 index suffix로 이미 고유 key 보장. cartesian row에 UUID 불필요 |
| 중간 | 회귀 테스트 | ✅ 완료 | `apps/web/src/shared/lib/qoo10OptionSerializer.test.ts` (cartesianProduct, (1,4)→(2,4) 축 변경, draft 추가/삭제 모델, _rowId 직렬화 무시 — 13 tests) |
| 낮음 | UI 검증 | ⬜ 미시작 | 긴 문자열 / 가로 스크롤 환경에서 실제 화면 확인 |
