import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraTestProvider } from '@/shared/mocks/test-utils';
import { ItemBulkActionBar } from './ItemBulkActionBar';
import type { Product } from '@oms/types';

// ─── 테스트용 상품 데이터 ──────────────────────────────────────

const makeItem = (id: string, rawStatus: string): Product =>
  ({
    id,
    rawStatus,
    sellerCode: `SELLER-${id}`,
    title: `테스트 상품 ${id}`,
    promotionName: '',
    status: rawStatus === 'S2' || rawStatus === 'S1' ? 'active' : 'inactive',
    price: 10000,
    settlePrice: 0,
    retailPrice: 0,
    qty: 100,
    imageUrl: '',
    category: { main: { code: '', name: '' }, sub1: { code: '', name: '' }, sub2: { code: '', name: '' } },
    origin: { type: '국내', place: '' },
    shippingNo: '',
    availableDate: { type: 'normal', value: '' },
    desiredShippingDate: '',
    keyword: [],
    isAdult: false,
    itemDetail: '',
    videoUrl: '',
    modelNm: '',
    manufacturerDate: '',
    brandNo: '',
    material: '',
    industrialCodeType: '',
    industrialCode: '',
    taxRate: '',
    listedDate: '',
    changedDate: '',
    expireDate: '',
    drugtype: '',
    optionShippingNo1: '',
    optionShippingNo2: '',
    contactInfo: '',
  } as Product);

// rawStatus: 'S2' = 거래가능(canSuspend=true), 'S1' = 거래대기(canActivate=true)
const activeItem = makeItem('ITEM-001', 'S2');
const pendingItem = makeItem('ITEM-002', 'S1');
const suspendedItem = makeItem('ITEM-003', 'S3');

// 버튼이 클릭 가능한지 확인하는 헬퍼
function isButtonEnabled(button: HTMLElement): boolean {
  // Chakra UI v3는 data-disabled 또는 disabled 속성을 사용
  return (
    !button.hasAttribute('disabled') &&
    button.getAttribute('data-disabled') !== 'true' &&
    button.getAttribute('aria-disabled') !== 'true'
  );
}

// ─── 테스트 ───────────────────────────────────────────────────

describe('ItemBulkActionBar', () => {
  const defaultProps = {
    selectedIds: new Set(['ITEM-001']),
    items: [activeItem, pendingItem, suspendedItem],
    remotePending: false,
    onBulkSuspendRequest: vi.fn(),
    onBulkActivateRequest: vi.fn(),
    onBulkDeleteRequest: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('선택된 항목이 없으면 렌더링하지 않는다', () => {
    const { container } = render(
      <ChakraTestProvider>
        <ItemBulkActionBar
          {...defaultProps}
          selectedIds={new Set()}
        />
      </ChakraTestProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('선택된 항목 수를 표시한다', () => {
    render(
      <ChakraTestProvider>
        <ItemBulkActionBar
          {...defaultProps}
          selectedIds={new Set(['ITEM-001', 'ITEM-002'])}
        />
      </ChakraTestProvider>,
    );

    expect(screen.getByText('2개 선택됨')).toBeDefined();
  });

  it('1개 선택 시 선택됨 텍스트가 표시된다', () => {
    render(
      <ChakraTestProvider>
        <ItemBulkActionBar {...defaultProps} />
      </ChakraTestProvider>,
    );

    expect(screen.getByText('1개 선택됨')).toBeDefined();
  });

  it('거래가능(S2) 상품 선택 시 판매중지 버튼이 클릭 가능하다', () => {
    render(
      <ChakraTestProvider>
        <ItemBulkActionBar
          {...defaultProps}
          selectedIds={new Set(['ITEM-001'])}
          items={[activeItem]}
        />
      </ChakraTestProvider>,
    );

    const suspendButton = screen.getByRole('button', { name: '판매중지' });
    expect(isButtonEnabled(suspendButton)).toBe(true);
  });

  it('거래대기(S1) 상품 선택 시 판매중으로 변경 버튼이 클릭 가능하다', () => {
    render(
      <ChakraTestProvider>
        <ItemBulkActionBar
          {...defaultProps}
          selectedIds={new Set(['ITEM-002'])}
          items={[pendingItem]}
        />
      </ChakraTestProvider>,
    );

    const activateButton = screen.getByRole('button', { name: '판매중으로 변경' });
    expect(isButtonEnabled(activateButton)).toBe(true);
  });

  it('삭제 버튼 클릭 시 onBulkDeleteRequest가 호출된다', () => {
    const onBulkDeleteRequest = vi.fn();
    render(
      <ChakraTestProvider>
        <ItemBulkActionBar
          {...defaultProps}
          onBulkDeleteRequest={onBulkDeleteRequest}
        />
      </ChakraTestProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onBulkDeleteRequest).toHaveBeenCalledTimes(1);
  });

  it('판매중지 버튼과 판매중으로 변경 버튼이 렌더링된다', () => {
    render(
      <ChakraTestProvider>
        <ItemBulkActionBar {...defaultProps} />
      </ChakraTestProvider>,
    );

    expect(screen.getByRole('button', { name: '판매중지' })).toBeDefined();
    expect(screen.getByRole('button', { name: '판매중으로 변경' })).toBeDefined();
    expect(screen.getByRole('button', { name: '삭제' })).toBeDefined();
  });

  it('remotePending=true이면 삭제 버튼이 비활성화된다', () => {
    render(
      <ChakraTestProvider>
        <ItemBulkActionBar
          {...defaultProps}
          selectedIds={new Set(['ITEM-001'])}
          items={[activeItem]}
          remotePending={true}
        />
      </ChakraTestProvider>,
    );

    const deleteButton = screen.getByRole('button', { name: '삭제' });
    expect(isButtonEnabled(deleteButton)).toBe(false);
  });

  it('거래중지(S3) 상품 선택 시 판매중지 버튼이 비활성화된다', () => {
    render(
      <ChakraTestProvider>
        <ItemBulkActionBar
          {...defaultProps}
          selectedIds={new Set(['ITEM-003'])}
          items={[suspendedItem]}
        />
      </ChakraTestProvider>,
    );

    const suspendButton = screen.getByRole('button', { name: '판매중지' });
    expect(isButtonEnabled(suspendButton)).toBe(false);
  });
});
