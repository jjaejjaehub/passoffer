import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChakraTestProvider } from "@/shared/mocks/test-utils";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

describe("DeleteConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    itemCodes: ["ITEM-001"],
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("isOpen=true이면 다이얼로그 타이틀이 렌더링된다", () => {
    render(
      <ChakraTestProvider>
        <DeleteConfirmDialog {...defaultProps} />
      </ChakraTestProvider>,
    );

    expect(screen.getByText("상품 삭제")).toBeDefined();
    expect(screen.getByText(/삭제하시겠습니까/)).toBeDefined();
  });

  it("isOpen=false이면 렌더링되지 않는다", () => {
    render(
      <ChakraTestProvider>
        <DeleteConfirmDialog {...defaultProps} isOpen={false} />
      </ChakraTestProvider>,
    );

    expect(screen.queryByText("상품 삭제")).toBeNull();
  });

  it('itemCodes가 2개 이상이면 "대상 N건" 텍스트를 표시한다', () => {
    render(
      <ChakraTestProvider>
        <DeleteConfirmDialog
          {...defaultProps}
          itemCodes={["ITEM-001", "ITEM-002", "ITEM-003"]}
        />
      </ChakraTestProvider>,
    );

    expect(screen.getByText("대상 3건")).toBeDefined();
  });

  it('itemCodes가 1개이면 "대상 N건" 텍스트를 표시하지 않는다', () => {
    render(
      <ChakraTestProvider>
        <DeleteConfirmDialog {...defaultProps} itemCodes={["ITEM-001"]} />
      </ChakraTestProvider>,
    );

    expect(screen.queryByText(/대상 \d+건/)).toBeNull();
  });

  it("취소 버튼 클릭 시 onClose가 호출된다", () => {
    const onClose = vi.fn();
    render(
      <ChakraTestProvider>
        <DeleteConfirmDialog {...defaultProps} onClose={onClose} />
      </ChakraTestProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("삭제 버튼 클릭 시 onConfirm이 호출된다", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ChakraTestProvider>
        <DeleteConfirmDialog
          {...defaultProps}
          onConfirm={onConfirm}
          onClose={onClose}
        />
      </ChakraTestProvider>,
    );

    // 삭제 버튼이 여러 개일 수 있으므로 role + name으로 찾기
    const deleteButtons = screen.getAllByRole("button", { name: "삭제" });
    // 다이얼로그 내부의 삭제 확인 버튼 클릭
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
