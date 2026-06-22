import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChakraTestProvider } from "@/shared/mocks/test-utils";
import { BulkActionBar } from "./BulkActionBar";

// ─── framer-motion 모킹 ──────────────────────────────────────
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

function renderBulkActionBar(
  overrides: Partial<Parameters<typeof BulkActionBar>[0]> = {},
) {
  const defaults = {
    selectedCount: 2,
    totalCount: 10,
    isAllSelected: false,
    onSelectAll: vi.fn(),
    onBulkShip: vi.fn(),
    onBulkCancel: vi.fn(),
    onClearSelection: vi.fn(),
    ...overrides,
  };
  render(
    <ChakraTestProvider>
      <BulkActionBar {...defaults} />
    </ChakraTestProvider>,
  );
  return defaults;
}

describe("BulkActionBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // window.confirm을 기본 승인으로 모킹
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("selectedCount가 0이면 아무것도 렌더링하지 않는다", () => {
    renderBulkActionBar({ selectedCount: 0 });
    expect(screen.queryByText(/건 선택됨/)).not.toBeInTheDocument();
  });

  it("selectedCount가 1 이상이면 선택 정보를 표시한다", () => {
    renderBulkActionBar({ selectedCount: 3, totalCount: 10 });
    expect(screen.getByText(/3건 선택됨/)).toBeInTheDocument();
    expect(screen.getByText(/총 10건 중/)).toBeInTheDocument();
  });

  it('"배송 처리" 버튼 클릭 시 onBulkShip이 호출된다', () => {
    const { onBulkShip } = renderBulkActionBar();
    fireEvent.click(screen.getByText("배송 처리"));
    expect(onBulkShip).toHaveBeenCalledTimes(1);
  });

  it('"취소 처리" 버튼 클릭 + confirm 승인 시 onBulkCancel이 호출된다', () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onBulkCancel } = renderBulkActionBar();
    fireEvent.click(screen.getByText("취소 처리"));
    expect(onBulkCancel).toHaveBeenCalledTimes(1);
  });

  it('"취소 처리" 버튼 클릭 + confirm 취소 시 onBulkCancel이 호출되지 않는다', () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onBulkCancel } = renderBulkActionBar();
    fireEvent.click(screen.getByText("취소 처리"));
    expect(onBulkCancel).not.toHaveBeenCalled();
  });

  it('"선택 해제" 버튼 클릭 시 onClearSelection이 호출된다', () => {
    const { onClearSelection } = renderBulkActionBar();
    fireEvent.click(screen.getByText("선택 해제"));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("isAllSelected=true 시 체크박스가 선택 상태다", () => {
    renderBulkActionBar({ isAllSelected: true });
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("체크박스 클릭 시 onSelectAll이 isAllSelected의 반대값으로 호출된다", () => {
    const { onSelectAll } = renderBulkActionBar({ isAllSelected: false });
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onSelectAll).toHaveBeenCalledWith(true);
  });
});
