import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraTestProvider } from '@/shared/mocks/test-utils';
import { TrackingFormModal } from './TrackingFormModal';
import type { Order } from '@/entities/order';

// ─── app-toaster 모킹 ────────────────────────────────────────
vi.mock('@/shared/ui/app-toaster', () => ({
  appToaster: {
    create: vi.fn(),
  },
}));

// ─── 테스트용 주문 목 데이터 ──────────────────────────────────
const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  channelOrderId: 'CH-001',
  channelId: 'qoo10',
  status: '신규',
  buyerName: '홍길동',
  buyerPhone: '010-0000-0000',
  shippingAddress: '서울특별시 강남구',
  items: [
    {
      id: 'item-1',
      productName: '테스트 상품 A',
      quantity: 1,
      unitPrice: 10000,
      totalPrice: 10000,
    },
  ],
  currency: 'KRW',
  originalAmount: 10000,
  krwAmount: 10000,
  totalAmount: 10000,
  paymentMethod: 'card',
  orderedAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  ...overrides,
});

const SINGLE_ORDER = [makeOrder()];
const BULK_ORDERS = [
  makeOrder({ id: 'order-1' }),
  makeOrder({ id: 'order-2', buyerName: '김철수' }),
];

function renderTrackingFormModal(
  overrides: {
    open?: boolean;
    orders?: Order[];
    onSubmit?: () => Promise<{ success: boolean; channelSyncFailed?: boolean }>;
    onOpenChange?: (open: boolean) => void;
  } = {},
) {
  const defaults = {
    open: true,
    orders: SINGLE_ORDER,
    onSubmit: vi.fn().mockResolvedValue({ success: true }),
    onOpenChange: vi.fn(),
    ...overrides,
  };
  render(
    <ChakraTestProvider>
      <TrackingFormModal {...defaults} />
    </ChakraTestProvider>,
  );
  return defaults;
}

describe('TrackingFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('open=false 이면 렌더링하지 않는다', () => {
    renderTrackingFormModal({ open: false });
    expect(screen.queryByText('배송 처리')).not.toBeInTheDocument();
  });

  it('단건 주문 시 주문 ID를 헤더에 표시한다', () => {
    renderTrackingFormModal({ orders: SINGLE_ORDER });
    expect(screen.getByText(/배송 처리 · order-1/)).toBeInTheDocument();
  });

  it('다건 주문 시 건수를 헤더에 표시한다', () => {
    renderTrackingFormModal({ orders: BULK_ORDERS });
    expect(screen.getByText(/2건 주문 배송 처리/)).toBeInTheDocument();
  });

  it('탭 "발송 예정일"과 "운송장 입력"이 렌더링된다', () => {
    renderTrackingFormModal();
    expect(screen.getAllByText(/발송 예정일/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/운송장 입력/).length).toBeGreaterThan(0);
  });

  it('초기에는 발송 예정일 탭이 활성화되어 있다', () => {
    renderTrackingFormModal();
    expect(screen.getByLabelText(/발송 예정일/)).toBeInTheDocument();
  });

  it('"운송장 입력" 탭 클릭 시 택배사 선택 필드가 표시된다', () => {
    renderTrackingFormModal();
    const trackingTabButtons = screen.getAllByText(/운송장 입력/);
    fireEvent.click(trackingTabButtons[0]);
    expect(screen.getAllByText(/택배사/).length).toBeGreaterThan(0);
  });

  it('X 버튼 클릭 시 onOpenChange(false)가 호출된다', () => {
    const { onOpenChange } = renderTrackingFormModal();
    const closeButton = screen.getAllByRole('button').find(
      (b) => b.querySelector('svg'),
    );
    if (closeButton) fireEvent.click(closeButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('"취소" 버튼 클릭 시 onOpenChange(false)가 호출된다', () => {
    const { onOpenChange } = renderTrackingFormModal();
    fireEvent.click(screen.getByText('취소'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('발송 예정일 폼 제출 시 onSubmit이 호출된다', async () => {
    const { onSubmit } = renderTrackingFormModal();
    fireEvent.click(screen.getByText('예정일 저장'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('운송장 탭에서 택배사 미선택 시 에러 메시지가 표시된다', async () => {
    renderTrackingFormModal();
    fireEvent.click(screen.getByText('운송장 입력'));
    fireEvent.click(screen.getByText('송장 등록'));
    await waitFor(() => {
      expect(screen.getByText('택배사를 선택해 주세요')).toBeInTheDocument();
    });
  });

  it('단건 주문의 상품명과 구매자 정보가 요약 영역에 표시된다', () => {
    renderTrackingFormModal({ orders: SINGLE_ORDER });
    expect(screen.getByText('테스트 상품 A')).toBeInTheDocument();
    expect(screen.getByText(/홍길동/)).toBeInTheDocument();
  });
});
