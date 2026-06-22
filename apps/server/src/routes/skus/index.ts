import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SkuService } from "../../services/SkuService";

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "숫자 문자열이어야 합니다.");

const playautoFields = {
  // 기본정보
  warehouseText: z.string().max(255).optional().nullable(),
  isPrimaryWarehouse: z.boolean().optional(),
  vendorText: z.string().max(255).optional().nullable(),
  leadTimeDays: z.number().int().min(0).optional().nullable(),
  safetyStock: z.number().int().min(0).optional(),
  modelName: z.string().max(255).optional().nullable(),
  inventoryCode: z.string().max(128).optional().nullable(),
  image: z.string().optional().nullable(),
  standardCode: z.string().max(64).optional().nullable(),
  hsCode: z.string().max(32).optional().nullable(),
  isbn: z.string().max(13).optional().nullable(),
  // 규격/가격
  isBundlable: z.boolean().optional(),
  widthCm: decimalString.optional().nullable(),
  heightCm: decimalString.optional().nullable(),
  depthCm: decimalString.optional().nullable(),
  weightKg: decimalString.optional().nullable(),
  inboundUnit: decimalString.optional().nullable(),
  inboundUnitType: z.string().max(16).optional().nullable(),
  purchaseCost: decimalString.optional(),
  purchaseFreight: decimalString.optional(),
  deliveryFee: decimalString.optional(),
  adCost: decimalString.optional(),
  etcCost: decimalString.optional(),
  supplyPrice: decimalString.optional().nullable(),
  salePrice: decimalString.optional().nullable(),
  currency: z.string().max(8).optional(),
  // 추가정보
  originCountry: z.string().max(64).optional().nullable(),
  originExtras: z.array(z.record(z.unknown())).optional(),
  requiresCaution: z.boolean().optional(),
  taxType: z.enum(["GENERAL", "ZERO", "EXEMPT"]).optional(),
  brand: z.string().max(128).optional().nullable(),
  manufacturer: z.string().max(128).optional().nullable(),
  manufacturerEn: z.string().max(40).optional().nullable(),
  ageGroup: z.string().max(32).optional().nullable(),
  infoNotice: z.record(z.unknown()).optional(),
  mainImage: z.string().optional().nullable(),
  descriptionHtml: z.string().optional().nullable(),
} as const;

const createBody = z.object({
  code: z.string().min(1, "SKU 코드를 입력해 주세요").max(128),
  name: z.string().max(255).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  barcode: z.string().max(64).optional().nullable(),
  attributes: z.record(z.unknown()).optional(),
  ...playautoFields,
});

const updateBody = createBody.partial().omit({ stock: true });

const bulkBody = z.object({
  items: z
    .array(createBody)
    .min(1, "최소 1개 이상의 SKU 가 필요합니다.")
    .max(500),
});

const adjustBody = z.object({
  qtyDelta: z.number().int(),
  note: z.string().max(255).optional(),
});

const attachBody = z.object({
  masterVariantId: z.string().uuid(),
  qty: z.number().int().min(1).optional(),
  position: z.number().int().min(0).optional(),
});

export async function skuRoutes(app: FastifyInstance): Promise<void> {
  const getSvc = (userId: string) => new SkuService(app, userId);

  app.get("/skus", { preHandler: [app.authenticate] }, async (request) => {
    const query = request.query as {
      search?: string;
      page?: string;
      pageSize?: string;
    };
    return getSvc(request.user.userId).listSkus({
      search: query.search,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  });

  app.get<{ Params: { id: string } }>(
    "/skus/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const sku = await getSvc(request.user.userId).getSku(request.params.id);
      if (!sku)
        return reply
          .status(404)
          .send({ error: "NOT_FOUND", message: "SKU 를 찾을 수 없습니다." });
      return sku;
    },
  );

  app.post(
    "/skus",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = createBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        const created = await getSvc(request.user.userId).createSku(
          parsed.data,
        );
        return reply.status(201).send(created);
      } catch (err) {
        return reply
          .status(400)
          .send({ error: "CREATE_FAILED", message: (err as Error).message });
      }
    },
  );

  app.post(
    "/skus/bulk",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = bulkBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        const created = await getSvc(request.user.userId).createSkusBulk(
          parsed.data,
        );
        return reply.status(201).send(created);
      } catch (err) {
        return reply
          .status(400)
          .send({
            error: "BULK_CREATE_FAILED",
            message: (err as Error).message,
          });
      }
    },
  );

  app.put<{ Params: { id: string } }>(
    "/skus/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = updateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        const updated = await getSvc(request.user.userId).updateSku(
          request.params.id,
          parsed.data,
        );
        return updated;
      } catch (err) {
        return reply
          .status(400)
          .send({ error: "UPDATE_FAILED", message: (err as Error).message });
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/skus/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        await getSvc(request.user.userId).deleteSku(request.params.id);
        return reply.status(204).send();
      } catch (err) {
        return reply
          .status(400)
          .send({ error: "DELETE_FAILED", message: (err as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/skus/:id/adjust-stock",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = adjustBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        const result = await getSvc(request.user.userId).adjustStock(
          request.params.id,
          parsed.data.qtyDelta,
          parsed.data.note,
        );
        return result;
      } catch (err) {
        return reply
          .status(400)
          .send({ error: "ADJUST_FAILED", message: (err as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/skus/:id/master-variants",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = attachBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        await getSvc(request.user.userId).attachToMasterVariant(
          request.params.id,
          parsed.data.masterVariantId,
          parsed.data.qty,
          parsed.data.position,
        );
        return reply.status(204).send();
      } catch (err) {
        return reply
          .status(400)
          .send({ error: "ATTACH_FAILED", message: (err as Error).message });
      }
    },
  );

  app.delete<{ Params: { id: string; masterVariantId: string } }>(
    "/skus/:id/master-variants/:masterVariantId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        await getSvc(request.user.userId).detachFromMasterVariant(
          request.params.id,
          request.params.masterVariantId,
        );
        return reply.status(204).send();
      } catch (err) {
        return reply
          .status(400)
          .send({ error: "DETACH_FAILED", message: (err as Error).message });
      }
    },
  );
}
