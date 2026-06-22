import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  sql,
} from "drizzle-orm";
import { orders } from "../../db/schema";

const RANK_TO_SEMANTIC: Record<number, string> = {
  10: "paid",
  20: "new",
  25: "hold_order",
  30: "ready",
  35: "hold_dispatch",
  40: "label_printed",
  50: "shipped",
  60: "in_transit",
  70: "delivered",
  80: "settled",
  90: "completed",
};

// 출고관리 프리셋: 결제완료/출고대기/출고보류/송장출력
const PRESET_RANKS = [25, 30, 35, 40] as const;

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

const listDispatchQuery = z.object({
  status: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => Number.parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n))
        : undefined,
    ),
  dateField: z.enum(["orderedAt", "paidAt", "shippedAt"]).default("orderedAt"),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  channelId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(100),
  sortBy: z
    .enum([
      "orderedAt",
      "paidAt",
      "shippedAt",
      "fulfillmentStatus",
      "total",
      "channelOrderId",
      "createdAt",
      "updatedAt",
    ])
    .default("orderedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export async function dispatchRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/dispatch — 출고관리 페이지 전용 목록 (PRESET_RANKS 범위 내)
  app.get(
    "/dispatch",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = listDispatchQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_QUERY", details: parsed.error.flatten() });
      }

      const {
        status,
        dateField,
        dateFrom,
        dateTo,
        channelId,
        page,
        pageSize,
        sortBy,
        sortDir,
      } = parsed.data;
      const userId = request.user.userId;

      // 페이지 프리셋: 출고관리 rank 범위로 제한 (counts 기준선)
      const baseConds = [
        eq(orders.userId, userId),
        inArray(orders.fulfillmentStatus, [...PRESET_RANKS]),
      ];
      if (channelId) baseConds.push(eq(orders.channelId, channelId));
      const dateCol = DATE_FIELDS[dateField];
      if (dateFrom) baseConds.push(gte(dateCol, new Date(dateFrom)));
      if (dateTo) baseConds.push(lte(dateCol, new Date(dateTo)));

      const itemsConds = [...baseConds];
      if (status && status.length > 0) {
        // 사용자가 chip으로 추가 필터한 경우 — PRESET 범위와 교집합
        const filtered = status.filter((s) =>
          (PRESET_RANKS as readonly number[]).includes(s),
        );
        if (filtered.length > 0) {
          itemsConds.push(inArray(orders.fulfillmentStatus, filtered));
        }
      }

      const orderByCol = SORT_COLUMNS[sortBy];
      const orderBy = sortDir === "asc" ? asc(orderByCol) : desc(orderByCol);

      const [
        items,
        totalRow,
        rankRows,
        holdRows,
        claimRow,
        allRow,
        carrierRows,
      ] = await Promise.all([
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
        // 페이지 특화: 송장출력(rank 40) 단계 캐리어 분포
        app.db
          .select({
            carrier: orders.trackingCarrier,
            n: sql<number>`count(*)::int`,
          })
          .from(orders)
          .where(
            and(
              ...baseConds,
              eq(orders.fulfillmentStatus, 40),
              isNotNull(orders.trackingCarrier),
            ),
          )
          .groupBy(orders.trackingCarrier),
      ]);

      const counts: Record<string, number> = { all: allRow[0]?.n ?? 0 };
      for (const r of PRESET_RANKS) counts[String(r)] = 0;
      for (const row of rankRows) {
        const key = String(row.rank);
        counts[key] = row.n;
        const semantic = RANK_TO_SEMANTIC[row.rank];
        if (
          semantic &&
          semantic !== "hold_order" &&
          semantic !== "hold_dispatch"
        ) {
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
        if (row.holdStatus === "order_hold") counts.hold_order = row.n;
        else if (row.holdStatus === "dispatch_hold")
          counts.hold_dispatch = row.n;
      }
      counts.claim_any = claimRow[0]?.n ?? 0;

      // 페이지 특화 dispatchSummary: 출고대기/송장출력/보류/캐리어 분포
      let readyCount = 0;
      let labelPrintedCount = 0;
      for (const row of rankRows) {
        if (row.rank === 30) readyCount = row.n;
        else if (row.rank === 40) labelPrintedCount = row.n;
      }
      const byCarrier = carrierRows
        .filter((r): r is { carrier: string; n: number } => !!r.carrier)
        .map((r) => ({ carrier: r.carrier, count: r.n }));
      const dispatchSummary = {
        readyCount,
        labelPrintedCount,
        holdOrderCount: counts.hold_order,
        holdDispatchCount: counts.hold_dispatch,
        byCarrier,
      };

      return {
        items,
        total: totalRow[0]?.n ?? 0,
        counts,
        dispatchSummary,
      };
    },
  );
}
