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

// ─── SFTP 일배치 Mock ─────────────────────────────────────────────
// 일배치 동기화, 로케이션/LOT 미지원. 재고는 마지막 배치 기준이므로 stale.

const LAST_BATCH_AT = new Date(Date.now() - 8 * 3600_000).toISOString(); // 8시간 전

const MOCK_STOCK: InventoryRow[] = [
  {
    sku: "SKU-001",
    vendorSku: "SFTP001",
    quantity: 300,
    reservedQuantity: 0,
    fetchedAt: LAST_BATCH_AT,
    freshness: "stale",
  },
  {
    sku: "SKU-002",
    vendorSku: "SFTP002",
    quantity: 45,
    reservedQuantity: 0,
    fetchedAt: LAST_BATCH_AT,
    freshness: "stale",
  },
  {
    sku: "SKU-004",
    vendorSku: "SFTP004",
    quantity: 0,
    reservedQuantity: 0,
    fetchedAt: LAST_BATCH_AT,
    freshness: "stale",
  },
];

const MOCK_HISTORY: HistoryEvent[] = [
  {
    id: "sftp-h-1",
    type: "inbound",
    sku: "SKU-001",
    quantity: 300,
    reasonCode: "BATCH_INBOUND",
    occurredAt: LAST_BATCH_AT,
    sourceVendor: "sftp_batch",
  },
  {
    id: "sftp-h-2",
    type: "adjustment",
    sku: "SKU-002",
    quantity: -5,
    reasonCode: "BATCH_ADJ",
    occurredAt: LAST_BATCH_AT,
    sourceVendor: "sftp_batch",
  },
];

export class MockSFTPBatchAdapter implements IWMSAdapter {
  readonly vendor: WMSVendor = "sftp_batch";
  readonly syncMode: SyncMode = "daily_batch";
  readonly capabilities: WMSCapabilities = {
    supportsRealtimeStock: false,
    supportsLotTracking: false,
    supportsLocationTree: false,
    locationDepth: 0,
    supportsBatchInbound: true,
    supportsRowLevelAdjustment: false,
    supportsCrossWarehouseTransfer: false,
    reasonCodeMapping: null,
  };

  async testConnection(): Promise<ConnectionHealth> {
    // SFTP 배치는 연결 상태를 직접 확인할 수 없으므로 'degraded' 반환
    return {
      status: "degraded",
      latencyMs: undefined,
      checkedAt: new Date().toISOString(),
      message: "일배치 SFTP — 실시간 연결 확인 불가",
    };
  }

  async fetchInventory(filter?: InventoryFilter): Promise<InventoryRow[]> {
    let rows = MOCK_STOCK;
    if (filter?.sku) rows = rows.filter((r) => r.sku === filter.sku);
    return rows;
  }

  async fetchLocations(): Promise<LocationNode[]> {
    return [];
  }

  async pushInboundInstruction(
    batch: InboundBatch,
  ): Promise<{ ack: boolean; vendorRef?: string }> {
    // SFTP 배치는 파일 업로드 방식 — ack는 true이지만 실제 반영은 다음 배치
    return { ack: true, vendorRef: `SFTP-INB-${Date.now()}` };
  }

  async requestAdjustment(
    req: AdjustmentRequest,
  ): Promise<{ status: "applied" | "pending_external"; vendorRef?: string }> {
    return { status: "pending_external", vendorRef: `SFTP-ADJ-${Date.now()}` };
  }

  async fetchHistory(range: DateRange): Promise<HistoryEvent[]> {
    return MOCK_HISTORY.filter(
      (h) =>
        h.occurredAt >= range.startDate &&
        h.occurredAt <= range.endDate + "T23:59:59Z",
    );
  }
}
