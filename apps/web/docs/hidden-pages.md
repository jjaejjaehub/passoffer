# 숨겨진 페이지 목록

로컬 개발 환경에서만 사이드바에 노출되는 메뉴 항목입니다.  
프로덕션/스테이징 빌드에서는 UI에서 숨겨지며, 라우트 자체는 유지됩니다.

## 환경 변수

| 변수 | 로컬(`.env.local`) | 기타 환경(`.env`) |
|---|---|---|
| `NEXT_PUBLIC_DEV_FEATURES` | `true` | `false` |

> `NEXT_PUBLIC_DEV_FEATURES=true` 일 때만 아래 메뉴가 사이드바에 표시됩니다.

---

## 숨겨진 메뉴 목록

### 1. 클레임 관리
- **경로**: `/claims`
- **위치**: 사이드바 > 주문 관리 하위
- **ROUTES 키**: `ROUTES.claims`
- **숨긴 이유**: 클레임 처리 플로우 미완성 (접수 → 처리 → 완료 상태 전환 API 미구현)

### 2. 창고 관리
- **경로**: `/warehouses`, `/admin/warehouses/*`
- **위치**: 사이드바 최상위 메뉴
- **ROUTES 키**: `ROUTES.warehouses`, `ROUTES.adminWarehouses.*`
- **하위 메뉴**:
  - 창고 목록 — `/warehouses`
  - 입고 예정 — `/admin/warehouses/inbound`
  - 재고 조회 — `/admin/warehouses/inventory`
  - 재고 이동/조정 — `/admin/warehouses/adjustments`
  - 재고 이력 — `/admin/warehouses/history`
  - 로케이션 관리 — `/admin/warehouses/locations`
- **숨긴 이유**: 창고 연동 기능 개발 중, 실 운영 데이터와 연결 전까지 노출 보류

### 3. 상품 문의
- **경로**: `/inquiry`
- **위치**: 사이드바 최상위 메뉴
- **ROUTES 키**: `ROUTES.inquiry`
- **숨긴 이유**: 문의 답변 기능 및 채널별 문의 수집 API 미완성

---

## 노출 조건 변경 방법

```bash
# 로컬에서 숨기고 싶을 때
# .env.local
NEXT_PUBLIC_DEV_FEATURES=false

# 스테이징에서 테스트하고 싶을 때
# 해당 환경의 .env 또는 환경변수 설정
NEXT_PUBLIC_DEV_FEATURES=true
```

## 적용 위치

`apps/web/src/widgets/app-shell/ui/Sidebar.tsx` — 파일 상단 상수:

```ts
const isDevFeaturesEnabled = process.env.NEXT_PUBLIC_DEV_FEATURES === "true";
```

각 메뉴를 `{isDevFeaturesEnabled && <.../>}` 로 감싸서 조건부 렌더링합니다.
