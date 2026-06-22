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
import { OrderService } from "../../services/OrderService";

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

// 결제관리 프리셋: 결제완료 (rank 10)
const PRESET_RANKS = [10] as const;

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

// JST 기준 오늘 YYYY-MM-DD (Asia/Tokyo)
function todayYmdJst(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA → YYYY-MM-DD
}

const confirmOrdersBody = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(5000),
  estimatedShippingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다."),
  delayType: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .optional()
    .default(1),
});

const listPaymentsQuery = z.object({
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
  dateField: z.enum(["orderedAt", "paidAt", "shippedAt"]).default("paidAt"),
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
    .default("paidAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export async function paymentsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/payments — 결제관리 페이지 (rank 10 결제완료) + 결제 특화 요약 필드
  app.get(
    "/payments",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = listPaymentsQuery.safeParse(request.query);
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

      // 결제관리는 PRESET 범위로 baseConds 고정
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
        paymentMethodRows,
        currencyRows,
        sumRow,
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
        // 페이지 특화: 결제수단별 분포 (baseConds 범위)
        app.db
          .select({
            method: orders.paymentMethod,
            n: sql<number>`count(*)::int`,
          })
          .from(orders)
          .where(and(...baseConds))
          .groupBy(orders.paymentMethod),
        // 페이지 특화: 통화별 분포
        app.db
          .select({
            currency: orders.currency,
            n: sql<number>`count(*)::int`,
            sumTotal: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
          })
          .from(orders)
          .where(and(...baseConds))
          .groupBy(orders.currency),
        // 페이지 특화: 총 결제금액 합계
        app.db
          .select({
            sumTotal: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
          })
          .from(orders)
          .where(and(...baseConds)),
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

      const byPaymentMethod: Record<string, number> = {};
      for (const row of paymentMethodRows) {
        byPaymentMethod[row.method ?? "unknown"] = row.n;
      }

      const byCurrency: Array<{
        currency: string;
        count: number;
        sumTotal: string;
      }> = currencyRows.map((row) => ({
        currency: row.currency,
        count: row.n,
        sumTotal: row.sumTotal ?? "0",
      }));

      return {
        items,
        total: totalRow[0]?.n ?? 0,
        counts,
        paymentSummary: {
          sumTotal: sumRow[0]?.sumTotal ?? "0",
          byPaymentMethod,
          byCurrency,
        },
      };
    },
  );

  // POST /api/payments/confirm — 결제완료(10) → 신규주문(20) 전환
  // Qoo10: SetSellerCheckYNBulk(15772) 호출. Shopify: API 호출 없이 즉시 rank 전환.
  app.post(
    "/payments/confirm",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = confirmOrdersBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }

      // EstShipDt: 오늘 이후만 허용 (Qoo10 -10018 회피)
      const today = todayYmdJst();
      if (parsed.data.estimatedShippingDate <= today) {
        return reply
          .status(400)
          .send({
            error: "INVALID_DATE",
            message: "발송예정일은 오늘 이후 날짜만 선택할 수 있습니다.",
          });
      }

      try {
        const svc = new OrderService(app);
        const result = await svc.confirmOrders({
          userId: request.user.userId,
          orderIds: parsed.data.orderIds,
          estimatedShippingDate: parsed.data.estimatedShippingDate,
          delayType: parsed.data.delayType,
        });
        return result;
      } catch (err: unknown) {
        app.log.error(err);
        const message =
          err instanceof Error
            ? err.message
            : "주문확인 중 오류가 발생했습니다.";
        return reply.status(500).send({ error: "CONFIRM_FAILED", message });
      }
    },
  );
}
