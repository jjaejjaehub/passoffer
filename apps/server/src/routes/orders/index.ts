import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { ChannelService } from '../../services/ChannelService';
import { orders, orderItems, masterProductVariants, masterProducts } from '../../db/schema';

// fulfillment rank → 의미 키 매핑 (counts 응답용)
const RANK_TO_SEMANTIC: Record<number, string> = {
  10: 'paid',
  20: 'new',
  25: 'hold_order',
  30: 'ready',
  35: 'hold_dispatch',
  40: 'label_printed',
  50: 'shipped',
  60: 'in_transit',
  70: 'delivered',
  80: 'settled',
  90: 'completed',
};
const ALL_RANKS = [10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90] as const;

const DATE_FIELDS = {
  orderedAt: orders.orderedAt,
  paidAt: orders.paidAt,
  shippedAt: orders.shippedAt,
} as const;

// drizzle column map for sorting
const SORT_COLUMNS = {
  orderedAt: orders.orderedAt,
  paidAt: orders.paidAt,
  shippedAt: orders.shippedAt,
  fulfillmentStatus: orders.fulfillmentStatus,
  total: orders.total,
  channelOrderId: orders.channelOrderId,
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
} as const;

const listOrdersQuery = z.object({
  status: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => Number.parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n))
        : undefined,
    ),
  dateField: z.enum(['orderedAt', 'paidAt', 'shippedAt']).default('orderedAt'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  channelId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(100),
  sortBy: z
    .enum(['orderedAt', 'paidAt', 'shippedAt', 'fulfillmentStatus', 'total', 'channelOrderId', 'createdAt', 'updatedAt'])
    .default('orderedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

const cancelBody = z.object({
  reason: z.string().optional(),
  packNo: z.number().optional(),
});

const approveReturnBody = z.object({
  packNo: z.number().optional(),
  claimId: z.string().optional(),
});

const declineReturnBody = z.object({
  declineReason: z.enum(['FINAL_SALE', 'NO_RETURN_IN_TIMEFRAME', 'OTHER']).optional(),
});

const refundReturnBody = z.object({
  lineItems: z
    .array(z.object({ returnLineItemId: z.string(), quantity: z.number().int().positive() }))
    .optional(),
  note: z.string().optional(),
});

const orderNoteBody = z.object({
  note: z.string(),
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
  // GET /api/orders — A안: { items, total, counts(전체 분포) }
  // counts 는 status 필터와 무관하게 항상 dateField/channelId 조건만 적용된 전체 분포를 반환.
  app.get('/orders', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = listOrdersQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_QUERY', details: parsed.error.flatten() });
    }

    const { status, dateField, dateFrom, dateTo, channelId, page, pageSize, sortBy, sortDir } = parsed.data;
    const userId = request.user.userId;

    // status 필터를 제외한 공통 조건 — counts/items 양쪽에서 공유
    const baseConds = [eq(orders.userId, userId)];
    if (channelId) baseConds.push(eq(orders.channelId, channelId));
    const dateCol = DATE_FIELDS[dateField];
    if (dateFrom) baseConds.push(gte(dateCol, new Date(dateFrom)));
    if (dateTo) baseConds.push(lte(dateCol, new Date(dateTo)));

    const itemsConds = [...baseConds];
    if (status && status.length > 0) {
      itemsConds.push(inArray(orders.fulfillmentStatus, status));
    }

    const orderByCol = SORT_COLUMNS[sortBy];
    const orderBy = sortDir === 'asc' ? asc(orderByCol) : desc(orderByCol);

    const [items, totalRow, rankRows, holdRows, claimRow, allRow] = await Promise.all([
      app.db
        .select()
        .from(orders)
        .where(and(...itemsConds))
        .orderBy(orderBy)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      app.db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(...itemsConds)),
      app.db
        .select({
          rank: orders.fulfillmentStatus,
          n: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(and(...baseConds))
        .groupBy(orders.fulfillmentStatus),
      app.db
        .select({
          holdStatus: orders.holdStatus,
          n: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(and(...baseConds, isNotNull(orders.holdStatus)))
        .groupBy(orders.holdStatus),
      app.db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(...baseConds, isNotNull(orders.claimStatus))),
      app.db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(...baseConds)),
    ]);

    const counts: Record<string, number> = { all: allRow[0]?.n ?? 0 };
    for (const r of ALL_RANKS) counts[String(r)] = 0;
    for (const row of rankRows) {
      const key = String(row.rank);
      counts[key] = row.n;
      const semantic = RANK_TO_SEMANTIC[row.rank];
      if (semantic && semantic !== 'hold_order' && semantic !== 'hold_dispatch') {
        counts[semantic] = (counts[semantic] ?? 0) + row.n;
      }
    }
    // 의미 키 0 초기화 (rankRows 가 비어도 응답 키 보장)
    for (const sem of Object.values(RANK_TO_SEMANTIC)) {
      if (counts[sem] === undefined) counts[sem] = 0;
    }
    counts.hold_order = 0;
    counts.hold_dispatch = 0;
    for (const row of holdRows) {
      if (row.holdStatus === 'order_hold') counts.hold_order = row.n;
      else if (row.holdStatus === 'dispatch_hold') counts.hold_dispatch = row.n;
    }
    counts.claim_any = claimRow[0]?.n ?? 0;

    return {
      items,
      total: totalRow[0]?.n ?? 0,
      counts,
    };
  });

  // GET /api/orders/channel/:channelId — 외부 채널 어댑터를 거친 라이브 조회 (옛 GET /orders 자리)
  app.get<{ Params: { channelId: string } }>(
    '/orders/channel/:channelId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const query = z
        .object({
          startDate: z.string().regex(/^\d{8}$/),
          endDate: z.string().regex(/^\d{8}$/),
          status: z.string().optional(),
          searchCondition: z.string().optional(),
        })
        .safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send({ error: 'INVALID_QUERY', details: query.error.flatten() });
      }
      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.getOrders) {
        return reply
          .status(501)
          .send({ error: 'NOT_SUPPORTED', message: '이 채널은 주문 조회를 지원하지 않습니다.' });
      }
      const result = await adapter.getOrders(query.data);
      return result;
    },
  );

  // GET /api/orders/:channelId/:orderId
  app.get<{ Params: { channelId: string; orderId: string } }>(
    '/orders/:channelId/:orderId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const svc = new ChannelService(app, request.user.userId);
        const adapter = await svc.getAdapter(request.params.channelId);
        if (!adapter.getOrderDetail) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 주문 상세 조회를 지원하지 않습니다.' });
        }
        const order = await adapter.getOrderDetail(request.params.orderId);
        return order;
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'Order not found';
        return reply.status(404).send({ error: 'NOT_FOUND', message });
      }
    },
  );

  // POST /api/orders/ship-date — 발송예정일 저장 (upsert)
  app.post('/orders/ship-date', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = shipDateBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }

    const { channelOrderId, shipDate } = parsed.data;
    const shipDateValue = shipDate ? new Date(shipDate) : null;
    const userId = request.user.userId;

    try {
      const existingOrders = await app.db
        .select()
        .from(orders)
        .where(and(eq(orders.channelOrderId, channelOrderId), eq(orders.userId, userId)))
        .limit(1);

      if (existingOrders.length === 0) {
        return reply.status(404).send({
          error: 'ORDER_NOT_FOUND',
          message: '주문을 찾을 수 없습니다. 먼저 채널 주문을 동기화해 주세요.',
        });
      }

      await app.db
        .update(orders)
        .set({
          shippingDueDate: shipDateValue,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.channelOrderId, channelOrderId), eq(orders.userId, userId)));

      return { ok: true };
    } catch (err: unknown) {
      app.log.error(err);
      return reply.status(500).send({ error: 'DB_ERROR', message: err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.' });
    }
  });

  // GET /api/orders/ship-date — 발송예정일 일괄 조회
  app.get('/orders/ship-date', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = z.object({
      channelOrderIds: z.string().min(1),
    }).safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({ error: 'INVALID_QUERY', details: query.error.flatten() });
    }

    const ids = query.data.channelOrderIds.split(',').filter(Boolean);
    const userId = request.user.userId;

    try {
      const rows = await app.db
        .select({
          channelOrderId: orders.channelOrderId,
          shipDate: orders.shippingDueDate,
        })
        .from(orders)
        .where(and(inArray(orders.channelOrderId, ids), eq(orders.userId, userId)));

      const shipDates: Record<string, string | null> = {};
      for (const row of rows) {
        shipDates[row.channelOrderId] = row.shipDate
          ? row.shipDate.toISOString().split('T')[0]
          : null;
      }

      return { shipDates };
    } catch (err: unknown) {
      app.log.error(err);
      return reply.status(500).send({ error: 'DB_ERROR', message: err instanceof Error ? err.message : '조회 중 오류가 발생했습니다.' });
    }
  });

  // PATCH /api/orders/:channelId/:orderId/shipment
  app.patch<{ Params: { channelId: string; orderId: string } }>(
    '/orders/:channelId/:orderId/shipment',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = shipmentBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.updateShipment) {
        return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 배송 정보 업데이트를 지원하지 않습니다.' });
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
        const shipDateValue = parsed.data.shipDate ? new Date(parsed.data.shipDate) : new Date();

        const orderRow = await app.db
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.userId, userId), eq(orders.channelOrderId, channelOrderId)))
          .limit(1);

        if (orderRow.length > 0) {
          const localOrderId = orderRow[0].id;
          await app.db
            .update(orders)
            .set({
              fulfillmentStatus: 50,
              trackingCarrier: parsed.data.carrierId,
              trackingNo: parsed.data.trackingNumber,
              shippedAt: shipDateValue,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, localOrderId));

          const items = await app.db
            .select({ sku: orderItems.skuCode, quantity: orderItems.orderQty })
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
              .select({ id: masterProductVariants.id, sku: masterProductVariants.sku })
              .from(masterProductVariants)
              .innerJoin(masterProducts, eq(masterProductVariants.masterProductId, masterProducts.id))
              .where(and(eq(masterProducts.userId, userId), inArray(masterProductVariants.sku, skus)));

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
        app.log.warn({ err }, 'shipment local sync skipped');
      }

      return { ok: true };
    },
  );

  // POST /api/orders/:channelId/:orderId/cancel
  app.post<{ Params: { channelId: string; orderId: string } }>(
    '/orders/:channelId/:orderId/cancel',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = cancelBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.cancelOrder) {
        return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 주문 취소를 지원하지 않습니다.' });
      }
      await adapter.cancelOrder({
        orderNo: request.params.orderId,
        packNo: parsed.data.packNo,
        reason: parsed.data.reason,
      });
      await app.db
        .update(orders)
        .set({ claimStatus: 'cancel_done', claimType: 'cancel' })
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
    '/orders/:channelId/returns',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const query = z.object({
        startDate: z.string().regex(/^\d{8}$/),
        endDate: z.string().regex(/^\d{8}$/),
        claimStatus: z.string().optional(),
      }).safeParse(request.query);

      if (!query.success) {
        return reply.status(400).send({ error: 'INVALID_QUERY', details: query.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.getReturns) {
        return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 반품 조회를 지원하지 않습니다.' });
      }
      const returns = await adapter.getReturns(query.data);
      return returns;
    },
  );

  // POST /api/orders/:channelId/:orderId/approve-return
  app.post<{ Params: { channelId: string; orderId: string } }>(
    '/orders/:channelId/:orderId/approve-return',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = approveReturnBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.approveReturn) {
        return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 반품 승인을 지원하지 않습니다.' });
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
    '/orders/:channelId/:orderId/decline-return',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = declineReturnBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.declineReturn) {
        return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 반품 거절을 지원하지 않습니다.' });
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
    '/orders/:channelId/:orderId/refund-return',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = refundReturnBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.refundReturn) {
        return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 반품 환불을 지원하지 않습니다.' });
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
    '/orders/:channelId/:orderId/note',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = orderNoteBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.updateOrderNote) {
        return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 주문 메모 수정을 지원하지 않습니다.' });
      }
      await adapter.updateOrderNote({
        orderId: request.params.orderId,
        note: parsed.data.note,
      });
      return { ok: true };
    },
  );
}
