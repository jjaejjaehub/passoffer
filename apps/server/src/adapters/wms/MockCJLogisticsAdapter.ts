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

// ─── CJ대한통운 3PL Mock ──────────────────────────────────────────
// LOT 미지원, 로케이션 1depth, 재고 조정은 pending_external.

const MOCK_STOCK: InventoryRow[] = [
  {
    sku: "SKU-001",
    vendorSku: "CJ-A001",
    locationCode: "ZONE-A",
    quantity: 200,
    reservedQuantity: 20,
    fetchedAt: new Date().toISOString(),
    freshness: "fresh",
  },
  {
    sku: "SKU-002",
    vendorSku: "CJ-A002",
    locationCode: "ZONE-A",
    quantity: 80,
    reservedQuantity: 0,
    fetchedAt: new Date(Date.now() - 600_000).toISOString(),
    freshness: "fresh",
  },
  {
    sku: "SKU-003",
    vendorSku: "CJ-B001",
    locationCode: "ZONE-B",
    quantity: 15,
    reservedQuantity: 15,
    fetchedAt: new Date(Date.now() - 3900_000).toISOString(),
    freshness: "stale",
  },
];

const MOCK_HISTORY: HistoryEvent[] = [
  {
    id: "cj-h-1",
    type: "inbound",
    sku: "SKU-001",
    quantity: 100,
    reasonCode: "INBOUND",
    vendorRef: "CJ-REF-001",
    occurredAt: new Date(Date.now() - 86400_000).toISOString(),
    sourceVendor: "cj_logistics",
  },
  {
    id: "cj-h-2",
    type: "outbound",
    sku: "SKU-002",
    quantity: 5,
    reasonCode: "OUTBOUND",
    occurredAt: new Date(Date.now() - 1800_000).toISOString(),
    sourceVendor: "cj_logistics",
  },
  {
    id: "cj-h-3",
    type: "adjustment",
    sku: "SKU-003",
    quantity: -2,
    reasonCode: "ADJ",
    vendorRef: "CJ-ADJ-003",
    occurredAt: new Date(Date.now() - 10800_000).toISOString(),
    sourceVendor: "cj_logistics",
  },
];

export class MockCJLogisticsAdapter implements IWMSAdapter {
  readonly vendor: WMSVendor = "cj_logistics";
  readonly syncMode: SyncMode = "polling_5m";
  readonly capabilities: WMSCapabilities = {
    supportsRealtimeStock: true,
    supportsLotTracking: false,
    supportsLocationTree: true,
    locationDepth: 1,
    supportsBatchInbound: true,
    supportsRowLevelAdjustment: false,
    supportsCrossWarehouseTransfer: false,
    reasonCodeMapping: { INBOUND: "입고", OUTBOUND: "출고", ADJ: "조정" },
  };

  async testConnection(): Promise<ConnectionHealth> {
    // 3PL REST API 시뮬레이션 — 약간의 latency
    await new Promise((r) => setTimeout(r, 80));
    return {
      status: "connected",
      latencyMs: 82,
      checkedAt: new Date().toISOString(),
    };
  }

  async fetchInventory(filter?: InventoryFilter): Promise<InventoryRow[]> {
    let rows = MOCK_STOCK;
    if (filter?.sku) rows = rows.filter((r) => r.sku === filter.sku);
    return rows;
  }

  async fetchLocations(): Promise<LocationNode[]> {
    return [
      { code: "ZONE-A", name: "A구역", level: 1, fullPath: "ZONE-A" },
      { code: "ZONE-B", name: "B구역", level: 1, fullPath: "ZONE-B" },
    ];
  }

  async pushInboundInstruction(
    batch: InboundBatch,
  ): Promise<{ ack: boolean; vendorRef?: string }> {
    return { ack: true, vendorRef: `CJ-INB-${Date.now()}` };
  }

  async requestAdjustment(
    req: AdjustmentRequest,
  ): Promise<{ status: "applied" | "pending_external"; vendorRef?: string }> {
    // CJ는 row-level 조정 미지원 → pending_external로 반환
    return { status: "pending_external", vendorRef: `CJ-ADJ-${Date.now()}` };
  }

  async fetchHistory(range: DateRange): Promise<HistoryEvent[]> {
    return MOCK_HISTORY.filter(
      (h) =>
        h.occurredAt >= range.startDate &&
        h.occurredAt <= range.endDate + "T23:59:59Z",
    );
  }
}
