# my-oms 작업 핸드오프 문서 (for Claude)

## 1) 현재 작업 목적

`InventoryOptionSection` / `SimpleOptionSection`의 옵션 테이블 편집 UX를 안정화하고,  
옵션 축(`OptionAxisState[]`)과 테이블 표시 상태(`cartesianProduct + manualRows + deletedKeys`)를 일관되게 유지하는 것이 핵심입니다.

최근에는 아래 두 축으로 작업이 진행되었습니다.

1. **조합형 옵션(`InventoryOptionSection`) 행 생성/수정/삭제의 상태 충돌 해결**
2. **더블클릭 편집 시 테이블 행/열 정렬 깨짐 방지(UI 고정폭/고정높이 적용)**

---

## 2) 최근 반영된 핵심 변경 사항

### A. OptionAxisForm에서 '선택안함' 기능 제거

대상 파일:
- `src/features/product-edit/ui/OptionAxisForm.tsx`
- `src/features/product-edit/ui/SimpleOptionSection.tsx`

반영 내용:
- `showNotSelectedToggle`, `useNotSelected`, `onUseNotSelectedChange` prop 제거
- `'선택안함'` 체크박스 UI 제거
- `handleApply`에서 `QOO10_SIMPLE_OPTION_NOT_SELECTED_VALUE` 자동 삽입 로직 제거
- Grid 컬럼을 `160px 1fr 40px`로 축소
- `SimpleOptionSection`에서 관련 state/prop 전달 제거

현재 상태:
- 더 이상 폼에서 `'選択しない'`를 자동 주입하지 않음

---

### B. InventoryOptionSection 상태 모델 (현재 기준)

대상 파일:
- `src/features/product-edit/ui/InventoryOptionSection.tsx`

주요 상태:
- `axes`: 카르테시안 생성의 기준 축
- `deletedKeys`: base(cartesianProduct)에서 숨길 key 집합
- `manualRows`: base 바깥에서 수동으로 표시하는 행
- `overrides`: 가격/재고/옵션코드 오버라이드
- `displayItems = (tableItems - deletedKeys + overrides) + manualRows`

핵심 의도:
- `axes` 변경 시 자동 생기는 원치 않는 행은 `deletedKeys`로 차단
- 사용자 편집/직접추가는 `manualRows`로 별도 관리

---

### C. commitEdit(Value1/2/3) 로직 (현재)

`commitEdit`의 else 블록은 다음 흐름:

1. 수정 전 row key(`oldItemKey`) 계산
2. 수정 후 row(`newItem`) / key(`newItemKey`) 계산
3. 축 값에 새 value를 추가한 `nextAxes` 계산(기존 value 유지)
4. `prevCartesianKeys` vs `nextCartesianKeys` 차집합을 구해 새로 생긴 키 차단
5. 상태 반영:
   - `setAxes(nextAxes)`, `setFormAxes(nextAxes)`, `setAppliedAxes(true)`
   - `deletedKeys`에 `oldItemKey` + 새로 생긴 key 추가
   - 단 `newItemKey`가 기존 base에 이미 있으면 `deletedKeys`에서 해제
   - `overrides` old->new key 이전
   - `newItem`이 기존 base에 없을 때만 `manualRows`에 추가

주의:
- 이 부분은 사용자 요청으로 여러 차례 변경됨.
- 현재 목표는 중복행 생성 없이 "수정 후 1행만" 보이게 하는 것.

---

### D. commitDraft 로직 (현재)

`commitDraft`는:
- `draftRow -> newItem` 생성
- `axes`에 입력된 새 value를 반영한 `nextAxes` 생성
- `prevKeys` / `nextKeys` 비교로 신규 cartesian key 계산
- 신규 key를 `deletedKeys`에 추가해 base 중복 노출 차단
- `manualRows`에 `newItem` 추가

의도:
- 축에는 값이 반영되어 폼에 보이되,
- 테이블에서는 `manualRows` 기준으로만 수동 추가 행이 보이게 유지.

---

### E. 테이블 더블클릭 편집 시 정렬 깨짐 대응

대상 파일:
- `src/features/product-edit/ui/InventoryOptionSection.tsx`
- `src/features/product-edit/ui/SimpleOptionSection.tsx`

반영 내용:
- `Table.Root`에 `style={{ tableLayout: "fixed" }}` 적용
- `Table.ColumnHeader`와 `Table.Cell` 너비를 동일하게 고정
  - 체크박스: `44px`
  - 값/가격/수량: `80px`
  - 판매자옵션코드: `120px`
  - 삭제 컬럼: `60px`
- 편집 가능한 `Table.Cell`에 `p={0}`, `verticalAlign="middle"`
- `Input` 공통: `w="100%" minW="0" h="28px" minH="28px"`
- `Box` 공통: `h="28px" minH="28px"`로 통일

효과:
- 더블클릭 전/후 행 높이와 열 너비 변화 최소화

---

## 3) 현재 확인된 동작/리스크

### 확인된 점
- `npx tsc --noEmit` 통과
- 수정 파일 대상 lint 경고 없음

### 남은 리스크
- `getInventoryKey`가 값 조합 기반이라, 완전히 동일한 값 조합 중복 행이 존재하면 식별 충돌 가능성 있음
- `manualRows` + `deletedKeys` + `overrides` 조합이 복잡하므로, 특정 편집 시나리오(특히 동일 key 재사용)에서 회귀 가능성 존재

---

## 4) Claude에게 요청하면 좋은 후속 점검

1. **회귀 테스트 시나리오 검증**
   - `(1,4)->(2,4)`, `(1,4)->(5,4)`, `(1,4)->(1,5)`, `(1,4)->(1,3)`
   - draft 추가 후 삭제/재적용/저장 흐름
2. **중복 key 전략 개선 검토**
   - 필요 시 row-level UUID 도입
3. **UI 정렬 실제 화면 검증**
   - 긴 문자열 옵션코드/축명, 가로 스크롤 환경에서 고정폭이 UX에 미치는 영향

---

## 5) 참고 대상 파일

- `src/features/product-edit/ui/OptionAxisForm.tsx`
- `src/features/product-edit/ui/SimpleOptionSection.tsx`
- `src/features/product-edit/ui/InventoryOptionSection.tsx`
- `src/shared/lib/qoo10OptionSerializer.ts`

