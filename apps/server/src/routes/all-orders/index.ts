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
const ALL_RANKS = [10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90] as const;

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

const listAllOrdersQuery = z.object({
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

export async function allOrdersRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/all-orders — 전체조회 페이지 (모든 rank, 프리셋 없음)
  app.get(
    "/all-orders",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = listAllOrdersQuery.safeParse(request.query);
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
      const orderBy = sortDir === "asc" ? asc(orderByCol) : desc(orderByCol);

      const [items, totalRow, rankRows, holdRows, claimRow, allRow] =
        await Promise.all([
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
        if (
          semantic &&
          semantic !== "hold_order" &&
          semantic !== "hold_dispatch"
        ) {
          counts[semantic] = (counts[semantic] ?? 0) + row.n;
        }
      }
      for (const sem of Object.values(RANK_TO_SEMANTIC)) {
        if (counts[sem] === undefined) counts[sem] = 0;
      }
      counts.hold_order = 0;
      counts.hold_dispatch = 0;
      for (const row of holdRows) {
        if (row.holdStatus === "order_hold") counts.hold_order = row.n;
        else if (row.holdStatus === "dispatch_hold")
          counts.hold_dispatch = row.n;
      }
      counts.claim_any = claimRow[0]?.n ?? 0;

      const paymentStage = counts["10"] ?? 0;
      const newOrderStage = counts["20"] ?? 0;
      const dispatchStage =
        (counts["25"] ?? 0) +
        (counts["30"] ?? 0) +
        (counts["35"] ?? 0) +
        (counts["40"] ?? 0);
      const shippingStage =
        (counts["50"] ?? 0) + (counts["60"] ?? 0) + (counts["70"] ?? 0);
      const settledStage = (counts["80"] ?? 0) + (counts["90"] ?? 0);
      const claimStage = counts.claim_any;

      return {
        items,
        total: totalRow[0]?.n ?? 0,
        counts,
        allSummary: {
          paymentStage,
          newOrderStage,
          dispatchStage,
          shippingStage,
          settledStage,
          claimStage,
        },
      };
    },
  );
}
