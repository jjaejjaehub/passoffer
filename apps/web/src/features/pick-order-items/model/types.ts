export interface OrderItemPickState {
  id: string;
  productName: string;
  option: string | null;
  sku: string | null;
  quantity: number;
  pickedQuantityByWarehouse: Record<string, number>;
}

export interface OrderPickContext {
  orderId: string;
  channelId: string;
  status: string;
  items: OrderItemPickState[];
}

export interface PickAllocation {
  orderItemId: string;
  warehouseId: string;
  quantity: number;
}

export interface PickOrderItemsRequest {
  allocations: PickAllocation[];
}

export interface PickOrderItemsResult {
  ok: true;
  allComplete: boolean;
  allocations: Array<{
    orderItemId: string;
    warehouseId: string;
    quantity: number;
    result: unknown;
  }>;
}
