import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { ChannelService } from '../../services/ChannelService';
import { orders } from '../../db/schema';

const claimsQuery = z.object({
  channelId: z.string().uuid(),
  startDate: z.string().regex(/^\d{8}$/),
  endDate: z.string().regex(/^\d{8}$/),
  claimStatus: z.string().optional(),
});

const ALL_CLAIM_STATUSES = [
  'cancel_requested',
  'cancel_done',
  'return_requested',
  'return_in_progress',
  'return_collected',
  'return_done',
  'exchange_requested',
  'exchange_in_progress',
  'exchange_collected',
  'exchange_done',
  'swap_requested',
  'swap_done',
  'requires_recheck',
] as const;

type ClaimStatus = (typeof ALL_CLAIM_STATUSES)[number];

const DATE_FIELDS = {
  orderedAt: orders.orderedAt,
  paidAt: orders.paidAt,
  shippedAt: orders.shippedAt,
} as const;

const SORT_COLUMNS = {
  orderedAt: orders.orderedAt,
  paidAt: orders.paidAt,
  shippedAt: orders.shippedAt,
  claimStatus: orders.claimStatus,
  total: orders.total,
  channelOrderId: orders.channelOrderId,
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
} as const;

const listClaimsQuery = z.object({
  claimStatus: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter((s): s is ClaimStatus =>
              (ALL_CLAIM_STATUSES as readonly string[]).includes(s),
            )
        : undefined,
    ),
  dateField: z.enum(['orderedAt', 'paidAt', 'shippedAt']).default('orderedAt'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  channelId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(100),
  sortBy: z
    .enum(['orderedAt', 'paidAt', 'shippedAt', 'claimStatus', 'total', 'channelOrderId', 'createdAt', 'updatedAt'])
    .default('orderedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export async function claimRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/claims — 채널 어댑터 라이브 조회 (기존 유지)
  app.get('/claims', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = claimsQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_QUERY', details: parsed.error.flatten() });
    }

    const svc = new ChannelService(app, request.user.userId);
    const adapter = await svc.getAdapter(parsed.data.channelId);
    if (!adapter.getClaims) {
      return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 클레임 조회를 지원하지 않습니다.' });
    }
    const claims = await adapter.getClaims({
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      claimStatus: parsed.data.claimStatus,
    });
    return claims;
  });

  // GET /api/claims/list — 클레임 페이지 전용 로컬 DB 목록
  // counts 는 claimStatus 필터와 무관하게 baseConds(claimStatus IS NOT NULL + 날짜/채널) 기준 전체 분포.
  app.get('/claims/list', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = listClaimsQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_QUERY', details: parsed.error.flatten() });
    }

    const { claimStatus, dateField, dateFrom, dateTo, channelId, page, pageSize, sortBy, sortDir } = parsed.data;
    const userId = request.user.userId;

    // 클레임 페이지 기준선: claimStatus 가 있는 주문만 + 날짜/채널
    const baseConds = [eq(orders.userId, userId), isNotNull(orders.claimStatus)];
    if (channelId) baseConds.push(eq(orders.channelId, channelId));
    const dateCol = DATE_FIELDS[dateField];
    if (dateFrom) baseConds.push(gte(dateCol, new Date(dateFrom)));
    if (dateTo) baseConds.push(lte(dateCol, new Date(dateTo)));

    const itemsConds = [...baseConds];
    if (claimStatus && claimStatus.length > 0) {
      itemsConds.push(inArray(orders.claimStatus, claimStatus));
    }

    const orderByCol = SORT_COLUMNS[sortBy];
    const orderBy = sortDir === 'asc' ? asc(orderByCol) : desc(orderByCol);

    const [items, totalRow, statusRows, typeRows, allRow] = await Promise.all([
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
          claimStatus: orders.claimStatus,
          n: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(and(...baseConds))
        .groupBy(orders.claimStatus),
      app.db
        .select({
          claimType: orders.claimType,
          n: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(and(...baseConds, isNotNull(orders.claimType)))
        .groupBy(orders.claimType),
      app.db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(...baseConds)),
    ]);

    const counts: Record<string, number> = { all: allRow[0]?.n ?? 0 };
    for (const s of ALL_CLAIM_STATUSES) counts[s] = 0;
    for (const row of statusRows) {
      if (row.claimStatus) counts[row.claimStatus] = row.n;
    }
    // claimType 집계 (cancel / return / exchange / swap)
    for (const row of typeRows) {
      if (row.claimType) counts[`type_${row.claimType}`] = row.n;
    }

    return {
      items,
      total: totalRow[0]?.n ?? 0,
      counts,
    };
  });
}
