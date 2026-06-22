import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { WarehouseService } from "../../services/WarehouseService";

const createWarehouseBody = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  vendor: z.enum(["self", "cj_logistics", "hanjin", "sftp_batch", "custom"]),
  syncMode: z.string().optional(),
});

const inboundBatchBody = z.object({
  expectedAt: z.string(),
  items: z.array(
    z.object({
      sku: z.string().min(1),
      quantity: z.number().int().positive(),
      lotCode: z.string().optional(),
    }),
  ),
  note: z.string().optional(),
});

const adjustmentBody = z.object({
  sku: z.string().min(1),
  delta: z.number().int(),
  reasonCode: z.string().min(1),
  locationCode: z.string().optional(),
  note: z.string().optional(),
});

const historyQuery = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

const inventoryQuery = z.object({
  sku: z.string().optional(),
  locationId: z.string().optional(),
  masterProductId: z.string().optional(),
});

export async function warehouseRoutes(app: FastifyInstance): Promise<void> {
  const getSvc = (userId: string) => new WarehouseService(app, userId);
  const preHandler = [app.authenticate];

  // ─── 창고 CRUD ────────────────────────────────────────────────

  app.get("/warehouses", { preHandler }, async (request) => {
    return getSvc(request.user.userId).listWarehouses();
  });

  app.post("/warehouses", { preHandler }, async (request, reply) => {
    const parsed = createWarehouseBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
    }
    return getSvc(request.user.userId).createWarehouse(parsed.data);
  });

  app.get<{ Params: { id: string } }>(
    "/warehouses/:id",
    { preHandler },
    async (request, reply) => {
      const wh = await getSvc(request.user.userId).getWarehouse(
        request.params.id,
      );
      if (!wh)
        return reply
          .status(404)
          .send({ error: "NOT_FOUND", message: "창고를 찾을 수 없습니다." });
      return wh;
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/warehouses/:id",
    { preHandler },
    async (request, reply) => {
      const deleted = await getSvc(request.user.userId).deleteWarehouse(
        request.params.id,
      );
      if (!deleted)
        return reply
          .status(404)
          .send({ error: "NOT_FOUND", message: "창고를 찾을 수 없습니다." });
      return { ok: true };
    },
  );

  // ─── 연결 상태 ────────────────────────────────────────────────

  app.get<{ Params: { id: string } }>(
    "/warehouses/:id/health",
    { preHandler },
    async (request, reply) => {
      try {
        return await getSvc(request.user.userId).checkHealth(request.params.id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Health check failed";
        return reply
          .status(400)
          .send({ error: "HEALTH_CHECK_FAILED", message });
      }
    },
  );

  // ─── Capabilities ─────────────────────────────────────────────

  app.get<{ Params: { id: string } }>(
    "/warehouses/:id/capabilities",
    { preHandler },
    async (request, reply) => {
      try {
        return await getSvc(request.user.userId).getCapabilities(
          request.params.id,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed";
        return reply.status(404).send({ error: "NOT_FOUND", message });
      }
    },
  );

  // ─── 재고 ─────────────────────────────────────────────────────

  app.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    "/warehouses/:id/inventory",
    { preHandler },
    async (request, reply) => {
      const parsed = inventoryQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        return await getSvc(request.user.userId).fetchInventory(
          request.params.id,
          parsed.data,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed";
        return reply.status(404).send({ error: "NOT_FOUND", message });
      }
    },
  );

  // ─── 로케이션 ─────────────────────────────────────────────────

  app.get<{ Params: { id: string } }>(
    "/warehouses/:id/locations",
    { preHandler },
    async (request, reply) => {
      try {
        return await getSvc(request.user.userId).fetchLocations(
          request.params.id,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed";
        return reply.status(404).send({ error: "NOT_FOUND", message });
      }
    },
  );

  // ─── 입고 ─────────────────────────────────────────────────────

  app.get<{ Params: { id: string } }>(
    "/warehouses/:id/inbound",
    { preHandler },
    async (request) => {
      return getSvc(request.user.userId).listInboundOrders(request.params.id);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/warehouses/:id/inbound",
    { preHandler },
    async (request, reply) => {
      const parsed = inboundBatchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        return await getSvc(request.user.userId).createInboundOrder(
          request.params.id,
          parsed.data,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed";
        return reply.status(400).send({ error: "INBOUND_FAILED", message });
      }
    },
  );

  // ─── 재고 조정 ────────────────────────────────────────────────

  app.post<{ Params: { id: string } }>(
    "/warehouses/:id/adjustments",
    { preHandler },
    async (request, reply) => {
      const parsed = adjustmentBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        return await getSvc(request.user.userId).requestAdjustment(
          request.params.id,
          parsed.data,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed";
        return reply.status(400).send({ error: "ADJUSTMENT_FAILED", message });
      }
    },
  );

  // ─── 이력 ─────────────────────────────────────────────────────

  app.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    "/warehouses/:id/history",
    { preHandler },
    async (request, reply) => {
      const parsed = historyQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        return await getSvc(request.user.userId).fetchHistory(
          request.params.id,
          parsed.data,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed";
        return reply.status(404).send({ error: "NOT_FOUND", message });
      }
    },
  );
}
