import type {
  IWMSAdapter,
  WMSVendor,
  WMSCapabilities,
  SyncMode,
  ConnectionHealth,
  InventoryFilter,
  InventoryRow,
  LocationNode,
  InboundBatch,
  AdjustmentRequest,
  DateRange,
  HistoryEvent,
} from "@oms/types";

// ─── 자체 창고 Mock ───────────────────────────────────────────────
// 모든 capability 지원. 3개 로케이션 × 3개 SKU × 2개 lot 시나리오 포함.

const MOCK_LOCATIONS: LocationNode[] = [
  {
    code: "A",
    name: "A동",
    level: 1,
    fullPath: "A",
    children: [
      {
        code: "A-01",
        name: "A-01 선반",
        level: 2,
        fullPath: "A > A-01",
        children: [],
      },
      {
        code: "A-02",
        name: "A-02 선반",
        level: 2,
        fullPath: "A > A-02",
        children: [],
      },
    ],
  },
  {
    code: "B",
    name: "B동",
    level: 1,
    fullPath: "B",
    children: [
      {
        code: "B-01",
        name: "B-01 냉장",
        level: 2,
        fullPath: "B > B-01",
        children: [],
      },
    ],
  },
];

const MOCK_STOCK: InventoryRow[] = [
  {
    sku: "SKU-001",
    vendorSku: "SELF-001",
    locationCode: "A-01",
    lotCode: "LOT-2024-01",
    quantity: 120,
    reservedQuantity: 10,
    fetchedAt: new Date().toISOString(),
    freshness: "fresh",
  },
  {
    sku: "SKU-001",
    vendorSku: "SELF-001",
    locationCode: "A-02",
    lotCode: "LOT-2024-02",
    quantity: 50,
    reservedQuantity: 0,
    fetchedAt: new Date().toISOString(),
    freshness: "fresh",
  },
  {
    sku: "SKU-002",
    vendorSku: "SELF-002",
    locationCode: "A-01",
    lotCode: undefined,
    quantity: 30,
    reservedQuantity: 5,
    fetchedAt: new Date().toISOString(),
    freshness: "fresh",
  },
  {
    sku: "SKU-003",
    vendorSku: "SELF-003",
    locationCode: "B-01",
    lotCode: "LOT-COLD-01",
    quantity: 0,
    reservedQuantity: 0,
    fetchedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    freshness: "stale",
  },
];

const MOCK_HISTORY: HistoryEvent[] = [
  {
    id: "h-1",
    type: "inbound",
    sku: "SKU-001",
    quantity: 50,
    reasonCode: "PURCHASE",
    vendorRef: "PO-001",
    occurredAt: new Date(Date.now() - 86400_000).toISOString(),
    sourceVendor: "self",
  },
  {
    id: "h-2",
    type: "outbound",
    sku: "SKU-001",
    quantity: 10,
    reasonCode: "SALE",
    occurredAt: new Date(Date.now() - 3600_000).toISOString(),
    sourceVendor: "self",
  },
  {
    id: "h-3",
    type: "adjustment",
    sku: "SKU-002",
    quantity: -3,
    reasonCode: "DAMAGE",
    occurredAt: new Date(Date.now() - 7200_000).toISOString(),
    sourceVendor: "self",
  },
];

export class MockSelfWarehouseAdapter implements IWMSAdapter {
  readonly vendor: WMSVendor = "self";
  readonly syncMode: SyncMode = "realtime";
  readonly capabilities: WMSCapabilities = {
    supportsRealtimeStock: true,
    supportsLotTracking: true,
    supportsLocationTree: true,
    locationDepth: 2,
    supportsBatchInbound: true,
    supportsRowLevelAdjustment: true,
    supportsCrossWarehouseTransfer: true,
    reasonCodeMapping: {
      PURCHASE: "입고",
      SALE: "출고",
      DAMAGE: "파손",
      RETURN: "반품",
    },
  };

  async testConnection(): Promise<ConnectionHealth> {
    return {
      status: "connected",
      latencyMs: 2,
      checkedAt: new Date().toISOString(),
    };
  }

  async fetchInventory(filter?: InventoryFilter): Promise<InventoryRow[]> {
    let rows = MOCK_STOCK;
    if (filter?.sku) rows = rows.filter((r) => r.sku === filter.sku);
    if (filter?.locationId)
      rows = rows.filter((r) => r.locationCode === filter.locationId);
    return rows;
  }

  async fetchLocations(): Promise<LocationNode[]> {
    return MOCK_LOCATIONS;
  }

  async pushInboundInstruction(
    batch: InboundBatch,
  ): Promise<{ ack: boolean; vendorRef?: string }> {
    return { ack: true, vendorRef: `SELF-INB-${Date.now()}` };
  }

  async requestAdjustment(
    req: AdjustmentRequest,
  ): Promise<{ status: "applied" | "pending_external"; vendorRef?: string }> {
    return { status: "applied" };
  }

  async fetchHistory(range: DateRange): Promise<HistoryEvent[]> {
    return MOCK_HISTORY.filter(
      (h) =>
        h.occurredAt >= range.startDate &&
        h.occurredAt <= range.endDate + "T23:59:59Z",
    );
  }
}
