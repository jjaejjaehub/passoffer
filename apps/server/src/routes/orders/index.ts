import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ChannelService } from "../../services/ChannelService";
import {
  orders,
  orderItems,
  masterProductVariants,
  masterProducts,
} from "../../db/schema";

const cancelBody = z.object({
  reason: z.string().optional(),
  packNo: z.number().optional(),
});

const approveReturnBody = z.object({
  packNo: z.number().optional(),
  claimId: z.string().optional(),
});

const declineReturnBody = z.object({
  declineReason: z
    .enum(["FINAL_SALE", "NO_RETURN_IN_TIMEFRAME", "OTHER"])
    .optional(),
});

const refundReturnBody = z.object({
  lineItems: z
    .array(
      z.object({
        returnLineItemId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .optional(),
  note: z.string().optional(),
});

const orderNoteBody = z.object({
  note: z.string(),
});

const ordersQuery = z.object({
  channelId: z.string().uuid(),
  startDate: z.string().regex(/^\d{8}$/),
  endDate: z.string().regex(/^\d{8}$/),
  status: z.string().optional(),
  searchCondition: z.string().optional(),
});

const shipmentBody = z.object({
  carrierId: z.string().min(1),
  trackingNumber: z.string().min(1),
  shipDate: z.string().optional(),
});

const shipDateBody = z.object({
  channelOrderId: z.string().min(1),
  channelType: z.string().min(1),
  shipDate: z.string().nullable(),
});

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/orders
  app.get(
    "/orders",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = ordersQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_QUERY", details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(parsed.data.channelId);
      if (!adapter.getOrders) {
        return reply
          .status(501)
          .send({
            error: "NOT_SUPPORTED",
            message: "이 채널은 주문 조회를 지원하지 않습니다.",
          });
      }
      const result = await adapter.getOrders({
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        status: parsed.data.status,
        searchCondition: parsed.data.searchCondition,
      });

      // 채널 어댑터에서 받은 주문을 DB에 동기화 — ship-date 저장 등 후속 작업이 의존
      // 동기화 실패는 조회 응답을 막지 않는다 (best-effort)
      try {
        if (Array.isArray(result) && result.length > 0) {
          const userId = request.user.userId;
          const channelId = parsed.data.channelId;
          const channelOrderIds = result
            .map((o) => o.channelOrderId)
            .filter(Boolean);
          const existing = channelOrderIds.length
            ? await app.db
                .select({ channelOrderId: orders.channelOrderId })
                .from(orders)
                .where(
                  and(
                    eq(orders.userId, userId),
                    inArray(orders.channelOrderId, channelOrderIds),
                  ),
                )
            : [];
          const existingSet = new Set(existing.map((r) => r.channelOrderId));
          const newOrders = result.filter(
            (o) => o.channelOrderId && !existingSet.has(o.channelOrderId),
          );
          if (newOrders.length > 0) {
            const toInsert = newOrders.map((o) => ({
              userId,
              channelId,
              channelOrderId: o.channelOrderId,
              status: "PENDING" as const,
              orderedAt: o.orderedAt ? new Date(o.orderedAt) : new Date(),
              buyerName: o.buyer?.name ?? null,
              buyerPhone: o.buyer?.tel ?? o.buyer?.mobile ?? null,
              buyerEmail: o.buyer?.email ?? null,
              receiver: o.shipping?.receiver ?? null,
              shippingAddress: o.shipping?.shippingAddress ?? null,
              zipCode: o.shipping?.zipCode ?? null,
              currency: o.payment?.currency ?? "JPY",
              totalAmount:
                o.payment?.totalAmount != null
                  ? String(o.payment.totalAmount)
                  : null,
              carrierId: o.carrierId ?? null,
              trackingNumber: o.trackingNumber ?? null,
              shipDate: o.shipDate ? new Date(o.shipDate) : null,
              rawData: o as unknown as Record<string, unknown>,
            }));
            const inserted = await app.db
              .insert(orders)
              .values(toInsert)
              .returning({
                id: orders.id,
                channelOrderId: orders.channelOrderId,
              });
            const idMap = new Map(
              inserted.map((r) => [r.channelOrderId, r.id]),
            );
            const itemRows = newOrders.flatMap((o) => {
              const orderId = idMap.get(o.channelOrderId);
              if (!orderId || !o.items?.length) return [];
              return o.items.map((it) => ({
                orderId,
                productName: it.productName,
                option: it.option ?? null,
                sku: it.sku ?? null,
                quantity: it.quantity,
                unitPrice: it.unitPrice != null ? String(it.unitPrice) : null,
                totalPrice:
                  it.totalPrice != null ? String(it.totalPrice) : null,
              }));
            });
            if (itemRows.length > 0) {
              await app.db.insert(orderItems).values(itemRows);
            }
          }
        }
      } catch (err) {
        app.log.warn({ err }, "orders DB sync skipped");
      }

      return result;
    },
  );

  // GET /api/orders/:channelId/:orderId
  app.get<{ Params: { channelId: string; orderId: string } }>(
    "/orders/:channelId/:orderId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const svc = new ChannelService(app, request.user.userId);
        const adapter = await svc.getAdapter(request.params.channelId);
        if (!adapter.getOrderDetail) {
          return reply
            .status(501)
            .send({
              error: "NOT_SUPPORTED",
              message: "이 채널은 주문 상세 조회를 지원하지 않습니다.",
            });
        }
        const order = await adapter.getOrderDetail(request.params.orderId);
        return order;
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : "Order not found";
        return reply.status(404).send({ error: "NOT_FOUND", message });
      }
    },
  );

  // POST /api/orders/ship-date — 발송예정일 저장 (upsert)
  app.post(
    "/orders/ship-date",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = shipDateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }

      const { channelOrderId, shipDate } = parsed.data;
      const shipDateValue = shipDate ? new Date(shipDate) : null;
      const userId = request.user.userId;

      try {
        const existingOrders = await app.db
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.channelOrderId, channelOrderId),
              eq(orders.userId, userId),
            ),
          )
          .limit(1);

        if (existingOrders.length === 0) {
          return reply.status(404).send({
            error: "ORDER_NOT_FOUND",
            message:
              "주문을 찾을 수 없습니다. 먼저 채널 주문을 동기화해 주세요.",
          });
        }

        await app.db
          .update(orders)
          .set({
            shipDate: shipDateValue,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(orders.channelOrderId, channelOrderId),
              eq(orders.userId, userId),
            ),
          );

        return { ok: true };
      } catch (err: unknown) {
        app.log.error(err);
        return reply
          .status(500)
          .send({
            error: "DB_ERROR",
            message:
              err instanceof Error
                ? err.message
                : "저장 중 오류가 발생했습니다.",
          });
      }
    },
  );

  // GET /api/orders/ship-date — 발송예정일 일괄 조회
  app.get(
    "/orders/ship-date",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const query = z
        .object({
          channelOrderIds: z.string().min(1),
        })
        .safeParse(request.query);

      if (!query.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_QUERY", details: query.error.flatten() });
      }

      const ids = query.data.channelOrderIds.split(",").filter(Boolean);
      const userId = request.user.userId;

      try {
        const rows = await app.db
          .select({
            channelOrderId: orders.channelOrderId,
            shipDate: orders.shipDate,
          })
          .from(orders)
          .where(
            and(inArray(orders.channelOrderId, ids), eq(orders.userId, userId)),
          );

        const shipDates: Record<string, string | null> = {};
        for (const row of rows) {
          shipDates[row.channelOrderId] = row.shipDate
            ? row.shipDate.toISOString().split("T")[0]
            : null;
        }

        return { shipDates };
      } catch (err: unknown) {
        app.log.error(err);
        return reply
          .status(500)
          .send({
            error: "DB_ERROR",
            message:
              err instanceof Error
                ? err.message
                : "조회 중 오류가 발생했습니다.",
          });
      }
    },
  );

  // PATCH /api/orders/:channelId/:orderId/shipment
  app.patch<{ Params: { channelId: string; orderId: string } }>(
    "/orders/:channelId/:orderId/shipment",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = shipmentBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.updateShipment) {
        return reply
          .status(501)
          .send({
            error: "NOT_SUPPORTED",
            message: "이 채널은 배송 정보 업데이트를 지원하지 않습니다.",
          });
      }
      await adapter.updateShipment({
        orderNo: request.params.orderId,
        carrierId: parsed.data.carrierId,
        trackingNumber: parsed.data.trackingNumber,
        shipDate: parsed.data.shipDate,
      });

      // 로컬 DB 반영 + 마스터 변형 재고 차감 (best-effort, 채널 호출은 이미 성공)
      try {
        const userId = request.user.userId;
        const channelOrderId = request.params.orderId;
        const shipDateValue = parsed.data.shipDate
          ? new Date(parsed.data.shipDate)
          : new Date();

        const orderRow = await app.db
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.userId, userId),
              eq(orders.channelOrderId, channelOrderId),
            ),
          )
          .limit(1);

        if (orderRow.length > 0) {
          const localOrderId = orderRow[0].id;
          await app.db
            .update(orders)
            .set({
              status: "SHIPPED",
              carrierId: parsed.data.carrierId,
              trackingNumber: parsed.data.trackingNumber,
              shipDate: shipDateValue,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, localOrderId));

          const items = await app.db
            .select({ sku: orderItems.sku, quantity: orderItems.quantity })
            .from(orderItems)
            .where(eq(orderItems.orderId, localOrderId));

          const skuToQty = new Map<string, number>();
          for (const it of items) {
            if (!it.sku) continue;
            skuToQty.set(it.sku, (skuToQty.get(it.sku) ?? 0) + it.quantity);
          }

          if (skuToQty.size > 0) {
            const skus = Array.from(skuToQty.keys());
            const variants = await app.db
              .select({
                id: masterProductVariants.id,
                sku: masterProductVariants.sku,
              })
              .from(masterProductVariants)
              .innerJoin(
                masterProducts,
                eq(masterProductVariants.masterProductId, masterProducts.id),
              )
              .where(
                and(
                  eq(masterProducts.userId, userId),
                  inArray(masterProductVariants.sku, skus),
                ),
              );

            for (const v of variants) {
              const qty = skuToQty.get(v.sku);
              if (!qty) continue;
              await app.db
                .update(masterProductVariants)
                .set({
                  stock: sql`GREATEST(${masterProductVariants.stock} - ${qty}, 0)`,
                  updatedAt: new Date(),
                })
                .where(eq(masterProductVariants.id, v.id));
            }
          }
        }
      } catch (err) {
        app.log.warn({ err }, "shipment local sync skipped");
      }

      return { ok: true };
    },
  );

  // POST /api/orders/:channelId/:orderId/cancel
  app.post<{ Params: { channelId: string; orderId: string } }>(
    "/orders/:channelId/:orderId/cancel",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = cancelBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.cancelOrder) {
        return reply
          .status(501)
          .send({
            error: "NOT_SUPPORTED",
            message: "이 채널은 주문 취소를 지원하지 않습니다.",
          });
      }
      await adapter.cancelOrder({
        orderNo: request.params.orderId,
        packNo: parsed.data.packNo,
        reason: parsed.data.reason,
      });
      await app.db
        .update(orders)
        .set({ status: "CANCELLED" })
        .where(
          and(
            eq(orders.userId, request.user.userId),
            eq(orders.channelOrderId, request.params.orderId),
          ),
        );
      return { ok: true };
    },
  );

  // GET /api/orders/:channelId/returns
  app.get<{ Params: { channelId: string } }>(
    "/orders/:channelId/returns",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const query = z
        .object({
          startDate: z.string().regex(/^\d{8}$/),
          endDate: z.string().regex(/^\d{8}$/),
          claimStatus: z.string().optional(),
        })
        .safeParse(request.query);

      if (!query.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_QUERY", details: query.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.getReturns) {
        return reply
          .status(501)
          .send({
            error: "NOT_SUPPORTED",
            message: "이 채널은 반품 조회를 지원하지 않습니다.",
          });
      }
      const returns = await adapter.getReturns(query.data);
      return returns;
    },
  );

  // POST /api/orders/:channelId/:orderId/approve-return
  app.post<{ Params: { channelId: string; orderId: string } }>(
    "/orders/:channelId/:orderId/approve-return",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = approveReturnBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.approveReturn) {
        return reply
          .status(501)
          .send({
            error: "NOT_SUPPORTED",
            message: "이 채널은 반품 승인을 지원하지 않습니다.",
          });
      }
      await adapter.approveReturn({
        orderNo: request.params.orderId,
        packNo: parsed.data.packNo,
        claimId: parsed.data.claimId,
      });
      return { ok: true };
    },
  );

  // POST /api/orders/:channelId/:orderId/decline-return
  app.post<{ Params: { channelId: string; orderId: string } }>(
    "/orders/:channelId/:orderId/decline-return",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = declineReturnBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.declineReturn) {
        return reply
          .status(501)
          .send({
            error: "NOT_SUPPORTED",
            message: "이 채널은 반품 거절을 지원하지 않습니다.",
          });
      }
      await adapter.declineReturn({
        returnId: request.params.orderId,
        declineReason: parsed.data.declineReason,
      });
      return { ok: true };
    },
  );

  // POST /api/orders/:channelId/:orderId/refund-return
  app.post<{ Params: { channelId: string; orderId: string } }>(
    "/orders/:channelId/:orderId/refund-return",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = refundReturnBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.refundReturn) {
        return reply
          .status(501)
          .send({
            error: "NOT_SUPPORTED",
            message: "이 채널은 반품 환불을 지원하지 않습니다.",
          });
      }
      await adapter.refundReturn({
        returnId: request.params.orderId,
        lineItems: parsed.data.lineItems,
        note: parsed.data.note,
      });
      return { ok: true };
    },
  );

  // PATCH /api/orders/:channelId/:orderId/note
  app.patch<{ Params: { channelId: string; orderId: string } }>(
    "/orders/:channelId/:orderId/note",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = orderNoteBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.updateOrderNote) {
        return reply
          .status(501)
          .send({
            error: "NOT_SUPPORTED",
            message: "이 채널은 주문 메모 수정을 지원하지 않습니다.",
          });
      }
      await adapter.updateOrderNote({
        orderId: request.params.orderId,
        note: parsed.data.note,
      });
      return { ok: true };
    },
  );
}
