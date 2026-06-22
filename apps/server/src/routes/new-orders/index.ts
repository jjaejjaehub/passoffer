import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { orderItems, orders } from '../../db/schema';
import { OrderService } from '../../services/OrderService';

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

// 신규주문 프리셋: 신규주문 (rank 20)
const PRESET_RANKS = [20] as const;

// SLA: 신규주문 → 출고대기 전환 SLA (hours)
const SLA_HOURS = 24;
const SLA_WARN_HOURS = 18;

const DATE_FIELDS = {
  orderedAt: orders.orderedAt,
  paidAt: orders.paidAt,
  shippedAt: orders.shippedAt,
} as const;

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

const listNewOrdersQuery = z.object({
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
  duplicateOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

const DUPLICATE_LOOKBACK_DAYS = 30;

type UrgencyFlag = 'overdue' | 'due_soon' | 'on_track';

function computeUrgency(orderedAt: Date | null | undefined, now: Date): {
  elapsedHours: number;
  slaDeadline: string;
  urgencyFlag: UrgencyFlag;
} {
  const ordered = orderedAt ?? now;
  const elapsedMs = now.getTime() - ordered.getTime();
  const elapsedHours = Math.max(0, elapsedMs / (1000 * 60 * 60));
  const deadline = new Date(ordered.getTime() + SLA_HOURS * 60 * 60 * 1000);
  let flag: UrgencyFlag = 'on_track';
  if (elapsedHours >= SLA_HOURS) flag = 'overdue';
  else if (elapsedHours >= SLA_WARN_HOURS) flag = 'due_soon';
  return {
    elapsedHours: Math.round(elapsedHours * 10) / 10,
    slaDeadline: deadline.toISOString(),
    urgencyFlag: flag,
  };
}

export async function newOrdersRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/new-orders — 신규주문 페이지 (rank 20) + SLA 특화 필드
  app.get('/new-orders', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = listNewOrdersQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_QUERY', details: parsed.error.flatten() });
    }

    const { status, dateField, dateFrom, dateTo, channelId, page, pageSize, sortBy, sortDir, duplicateOnly } =
      parsed.data;
    const userId = request.user.userId;
    const now = new Date();
    const overdueCutoff = new Date(now.getTime() - SLA_HOURS * 60 * 60 * 1000);
    const warnCutoff = new Date(now.getTime() - SLA_WARN_HOURS * 60 * 60 * 1000);
    const dupLookbackCutoff = new Date(now.getTime() - DUPLICATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const baseConds = [eq(orders.userId, userId), inArray(orders.fulfillmentStatus, [...PRESET_RANKS])];
    if (channelId) baseConds.push(eq(orders.channelId, channelId));
    const dateCol = DATE_FIELDS[dateField];
    if (dateFrom) baseConds.push(gte(dateCol, new Date(dateFrom)));
    if (dateTo) baseConds.push(lte(dateCol, new Date(dateTo)));

    const itemsConds = [...baseConds];
    if (status && status.length > 0) {
      const filtered = status.filter((s) => (PRESET_RANKS as readonly number[]).includes(s));
      if (filtered.length > 0) {
        itemsConds.push(inArray(orders.fulfillmentStatus, filtered));
      }
    }
    if (duplicateOnly) {
      itemsConds.push(
        sql`${orders.duplicateGroupKey} IS NOT NULL AND ${orders.duplicateGroupKey} IN (
          SELECT duplicate_group_key FROM ${orders}
          WHERE user_id = ${userId}
            AND duplicate_group_key IS NOT NULL
            AND ordered_at >= ${dupLookbackCutoff}
          GROUP BY duplicate_group_key
          HAVING count(*) > 1
        )`,
      );
    }

    const orderByCol = SORT_COLUMNS[sortBy];
    const orderBy = sortDir === 'asc' ? asc(orderByCol) : desc(orderByCol);

    const [rawItems, totalRow, rankRows, holdRows, claimRow, allRow, overdueRow, dueSoonRow] = await Promise.all([
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
      // 페이지 특화: SLA 초과 (orderedAt <= now - 24h)
      app.db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(...baseConds, lte(orders.orderedAt, overdueCutoff))),
      // 페이지 특화: SLA 임박 (orderedAt <= now - 18h, > now - 24h)
      app.db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(...baseConds, lte(orders.orderedAt, warnCutoff), gte(orders.orderedAt, overdueCutoff))),
    ]);

    // duplicateGroupKey 별 같은 유저 30일 윈도우 카운트 (페이지 결과에 머지)
    const dupKeys = Array.from(
      new Set(
        rawItems
          .map((r) => r.duplicateGroupKey)
          .filter((k): k is string => typeof k === 'string' && k.length > 0),
      ),
    );
    const dupCountMap = new Map<string, number>();
    if (dupKeys.length > 0) {
      const dupRows = await app.db
        .select({
          key: orders.duplicateGroupKey,
          n: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.userId, userId),
            inArray(orders.duplicateGroupKey, dupKeys),
            gte(orders.orderedAt, dupLookbackCutoff),
          ),
        )
        .groupBy(orders.duplicateGroupKey);
      for (const r of dupRows) {
        if (r.key) dupCountMap.set(r.key, r.n);
      }
    }

    // SLA + duplicateCount 필드를 각 item에 머지
    const items = rawItems.map((row) => ({
      ...row,
      sla: computeUrgency(row.orderedAt, now),
      duplicateCount: row.duplicateGroupKey ? dupCountMap.get(row.duplicateGroupKey) ?? null : null,
    }));

    const counts: Record<string, number> = { all: allRow[0]?.n ?? 0 };
    for (const r of PRESET_RANKS) counts[String(r)] = 0;
    for (const row of rankRows) {
      const key = String(row.rank);
      counts[key] = row.n;
      const semantic = RANK_TO_SEMANTIC[row.rank];
      if (semantic && semantic !== 'hold_order' && semantic !== 'hold_dispatch') {
        counts[semantic] = (counts[semantic] ?? 0) + row.n;
      }
    }
    for (const r of PRESET_RANKS) {
      const sem = RANK_TO_SEMANTIC[r];
      if (sem && counts[sem] === undefined) counts[sem] = 0;
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
      slaSummary: {
        slaHours: SLA_HOURS,
        warnHours: SLA_WARN_HOURS,
        overdueCount: overdueRow[0]?.n ?? 0,
        dueSoonCount: dueSoonRow[0]?.n ?? 0,
        now: now.toISOString(),
      },
    };
  });

  // GET /api/new-orders/:id/items — 주문 line items (분할 모달용)
  app.get(
    '/new-orders/:id/items',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          error: 'INVALID_PARAMS',
          details: params.error.flatten(),
        });
      }
      const userId = request.user.userId;
      const [order] = await app.db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.id, params.data.id), eq(orders.userId, userId)))
        .limit(1);
      if (!order) {
        return reply.status(404).send({ error: 'ORDER_NOT_FOUND' });
      }
      const rows = await app.db
        .select({
          id: orderItems.id,
          channelItemCode: orderItems.channelItemCode,
          channelItemTitle: orderItems.channelItemTitle,
          channelOption: orderItems.channelOption,
          channelOptionCode: orderItems.channelOptionCode,
          orderQty: orderItems.orderQty,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, params.data.id))
        .orderBy(asc(orderItems.lineNo));
      return { items: rows };
    },
  );

  // POST /api/new-orders/dispatch — 출고지시 (20 → 30)
  app.post(
    '/new-orders/dispatch',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const schema = z.object({
        orderIds: z.array(z.string().uuid()).min(1),
        reason: z.string().optional(),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'INVALID_BODY',
          details: parsed.error.flatten(),
        });
      }
      const svc = new OrderService(app);
      try {
        const result = await svc.dispatchOrders({
          userId: request.user.userId,
          orderIds: parsed.data.orderIds,
          reason: parsed.data.reason,
        });
        return result;
      } catch (err) {
        return reply.status(500).send({
          error: 'DISPATCH_FAILED',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // POST /api/new-orders/copy — 주문 복제
  app.post(
    '/new-orders/copy',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const schema = z.object({ orderId: z.string().uuid() });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'INVALID_BODY',
          details: parsed.error.flatten(),
        });
      }
      const svc = new OrderService(app);
      try {
        const result = await svc.copyOrder({
          userId: request.user.userId,
          orderId: parsed.data.orderId,
        });
        return result;
      } catch (err) {
        return reply.status(400).send({
          error: 'COPY_FAILED',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // POST /api/new-orders/delete — 주문 삭제 (우리 DB만)
  app.post(
    '/new-orders/delete',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const schema = z.object({
        orderIds: z.array(z.string().uuid()).min(1),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'INVALID_BODY',
          details: parsed.error.flatten(),
        });
      }
      const svc = new OrderService(app);
      try {
        const result = await svc.deleteOrders({
          userId: request.user.userId,
          orderIds: parsed.data.orderIds,
        });
        return result;
      } catch (err) {
        return reply.status(500).send({
          error: 'DELETE_FAILED',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // POST /api/new-orders/split — 주문 분할
  app.post(
    '/new-orders/split',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const schema = z.object({
        orderId: z.string().uuid(),
        splits: z
          .array(
            z.object({
              itemIds: z.array(z.string().uuid()).min(1),
            }),
          )
          .min(1),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'INVALID_BODY',
          details: parsed.error.flatten(),
        });
      }
      const svc = new OrderService(app);
      try {
        const result = await svc.splitOrder({
          userId: request.user.userId,
          orderId: parsed.data.orderId,
          splits: parsed.data.splits,
        });
        return result;
      } catch (err) {
        return reply.status(400).send({
          error: 'SPLIT_FAILED',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // POST /api/new-orders/bundle — 합포장
  app.post(
    '/new-orders/bundle',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const schema = z.object({
        orderIds: z.array(z.string().uuid()).min(2),
        primaryOrderId: z.string().uuid().optional(),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'INVALID_BODY',
          details: parsed.error.flatten(),
        });
      }
      const svc = new OrderService(app);
      try {
        const result = await svc.bundleOrders({
          userId: request.user.userId,
          orderIds: parsed.data.orderIds,
          primaryOrderId: parsed.data.primaryOrderId,
        });
        return result;
      } catch (err) {
        return reply.status(400).send({
          error: 'BUNDLE_FAILED',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );
}
