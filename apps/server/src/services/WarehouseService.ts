import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import {
  warehouses,
  warehouseLocations,
  warehouseStocks,
  inboundOrders,
  stockMovements,
} from '../db/schema';
import type {
  IWMSAdapter,
  WMSVendor,
  InventoryFilter,
  InboundBatch,
  AdjustmentRequest,
  DateRange,
} from '@oms/types';
import { MockSelfWarehouseAdapter } from '../adapters/wms/MockSelfWarehouseAdapter';
import { MockCJLogisticsAdapter } from '../adapters/wms/MockCJLogisticsAdapter';
import { MockSFTPBatchAdapter } from '../adapters/wms/MockSFTPBatchAdapter';

export class WarehouseService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly userId: string,
  ) {}

  private getAdapter(vendor: WMSVendor): IWMSAdapter {
    switch (vendor) {
      case 'self': return new MockSelfWarehouseAdapter();
      case 'cj_logistics': return new MockCJLogisticsAdapter();
      case 'sftp_batch': return new MockSFTPBatchAdapter();
      default: throw new Error(`Unsupported WMS vendor: ${vendor}`);
    }
  }

  // ─── 창고 CRUD ────────────────────────────────────────────────

  async listWarehouses() {
    return this.app.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.userId, this.userId));
  }

  async getWarehouse(id: string) {
    const [row] = await this.app.db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.id, id), eq(warehouses.userId, this.userId)))
      .limit(1);
    return row ?? null;
  }

  async createWarehouse(input: {
    code: string;
    name: string;
    vendor: WMSVendor;
    syncMode?: string;
  }) {
    const adapter = this.getAdapter(input.vendor);
    const [created] = await this.app.db
      .insert(warehouses)
      .values({
        userId: this.userId,
        code: input.code,
        name: input.name,
        vendor: input.vendor,
        syncMode: input.syncMode ?? adapter.syncMode,
        capabilitiesJson: adapter.capabilities,
      })
      .returning();
    return created;
  }

  async deleteWarehouse(id: string): Promise<boolean> {
    const [deleted] = await this.app.db
      .delete(warehouses)
      .where(and(eq(warehouses.id, id), eq(warehouses.userId, this.userId)))
      .returning();
    return !!deleted;
  }

  // ─── 연결 상태 ────────────────────────────────────────────────

  async checkHealth(warehouseId: string) {
    const wh = await this.getWarehouse(warehouseId);
    if (!wh) throw new Error(`Warehouse not found: ${warehouseId}`);
    const adapter = this.getAdapter(wh.vendor as WMSVendor);
    const health = await adapter.testConnection();

    await this.app.db
      .update(warehouses)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(warehouses.id, warehouseId));

    return { ...health, vendor: wh.vendor, warehouseId };
  }

  // ─── 재고 ─────────────────────────────────────────────────────

  async fetchInventory(warehouseId: string, filter?: InventoryFilter) {
    const wh = await this.getWarehouse(warehouseId);
    if (!wh) throw new Error(`Warehouse not found: ${warehouseId}`);
    const adapter = this.getAdapter(wh.vendor as WMSVendor);
    return adapter.fetchInventory({ ...filter, warehouseId });
  }

  // ─── 로케이션 ─────────────────────────────────────────────────

  async fetchLocations(warehouseId: string) {
    const wh = await this.getWarehouse(warehouseId);
    if (!wh) throw new Error(`Warehouse not found: ${warehouseId}`);
    const adapter = this.getAdapter(wh.vendor as WMSVendor);
    return adapter.fetchLocations();
  }

  // ─── 입고 ─────────────────────────────────────────────────────

  async createInboundOrder(warehouseId: string, batch: InboundBatch) {
    const wh = await this.getWarehouse(warehouseId);
    if (!wh) throw new Error(`Warehouse not found: ${warehouseId}`);
    const adapter = this.getAdapter(wh.vendor as WMSVendor);
    const result = await adapter.pushInboundInstruction(batch);

    const [created] = await this.app.db
      .insert(inboundOrders)
      .values({
        userId: this.userId,
        warehouseId,
        status: 'instructed',
        vendorRef: result.vendorRef,
        expectedAt: batch.expectedAt ? new Date(batch.expectedAt) : undefined,
        itemsJson: batch.items,
        note: batch.note,
      })
      .returning();
    return { ...created, ack: result.ack, vendorRef: result.vendorRef };
  }

  async listInboundOrders(warehouseId: string) {
    return this.app.db
      .select()
      .from(inboundOrders)
      .where(and(eq(inboundOrders.warehouseId, warehouseId), eq(inboundOrders.userId, this.userId)));
  }

  // ─── 재고 조정 ────────────────────────────────────────────────

  async requestAdjustment(warehouseId: string, req: AdjustmentRequest) {
    const wh = await this.getWarehouse(warehouseId);
    if (!wh) throw new Error(`Warehouse not found: ${warehouseId}`);
    const adapter = this.getAdapter(wh.vendor as WMSVendor);
    const result = await adapter.requestAdjustment(req);

    const [movement] = await this.app.db
      .insert(stockMovements)
      .values({
        userId: this.userId,
        warehouseId,
        type: 'adjustment',
        status: result.status,
        vendorRef: result.vendorRef,
        reasonCode: req.reasonCode,
        payloadJson: req,
      })
      .returning();
    return { ...movement, ...result };
  }

  // ─── 이력 ─────────────────────────────────────────────────────

  async fetchHistory(warehouseId: string, range: DateRange) {
    const wh = await this.getWarehouse(warehouseId);
    if (!wh) throw new Error(`Warehouse not found: ${warehouseId}`);
    const adapter = this.getAdapter(wh.vendor as WMSVendor);
    return adapter.fetchHistory(range);
  }

  // ─── Capability 조회 ──────────────────────────────────────────

  async getCapabilities(warehouseId: string) {
    const wh = await this.getWarehouse(warehouseId);
    if (!wh) throw new Error(`Warehouse not found: ${warehouseId}`);
    const adapter = this.getAdapter(wh.vendor as WMSVendor);
    return { vendor: adapter.vendor, syncMode: adapter.syncMode, capabilities: adapter.capabilities };
  }
}
