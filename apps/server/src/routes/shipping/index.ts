import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { orders } from '../../db/schema';

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

// 배송관리 프리셋: 출고완료/배송중/배송완료
const PRESET_RANKS = [50, 60, 70] as const;

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

const listShippingQuery = z.object({
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
  dateField: z.enum(['orderedAt', 'paidAt', 'shippedAt']).default('shippedAt'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  channelId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(100),
  sortBy: z
    .enum(['orderedAt', 'paidAt', 'shippedAt', 'fulfillmentStatus', 'total', 'channelOrderId', 'createdAt', 'updatedAt'])
    .default('shippedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export async function shippingRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/shipping — 배송관리 페이지 전용 목록
  app.get('/shipping', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = listShippingQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_QUERY', details: parsed.error.flatten() });
    }

    const { status, dateField, dateFrom, dateTo, channelId, page, pageSize, sortBy, sortDir } = parsed.data;
    const userId = request.user.userId;

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

    const orderByCol = SORT_COLUMNS[sortBy];
    const orderBy = sortDir === 'asc' ? asc(orderByCol) : desc(orderByCol);

    const [items, totalRow, rankRows, claimRow, allRow] = await Promise.all([
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
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(...baseConds, isNotNull(orders.claimStatus))),
      app.db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(...baseConds)),
    ]);

    const counts: Record<string, number> = { all: allRow[0]?.n ?? 0 };
    for (const r of PRESET_RANKS) counts[String(r)] = 0;
    for (const row of rankRows) {
      const key = String(row.rank);
      counts[key] = row.n;
      const semantic = RANK_TO_SEMANTIC[row.rank];
      if (semantic) counts[semantic] = (counts[semantic] ?? 0) + row.n;
    }
    for (const r of PRESET_RANKS) {
      const sem = RANK_TO_SEMANTIC[r];
      if (sem && counts[sem] === undefined) counts[sem] = 0;
    }
    counts.claim_any = claimRow[0]?.n ?? 0;

    return {
      items,
      total: totalRow[0]?.n ?? 0,
      counts,
    };
  });
}
