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

const sendShippingBulkBody = z.object({
  items: z
    .array(
      z.object({
        orderId: z.string().uuid(),
        shippingCorp: z.string().min(1).max(200),
        trackingNo: z.string().min(1).max(50),
      }),
    )
    .min(1)
    .max(5000),
});

// 발송예정일은 JST 기준 오늘 이후 (Qoo10 -10018 회피)
const todayYmdJst = (): string => {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const dispatchDelayBody = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(5000),
  estimatedShippingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "발송예정일은 YYYY-MM-DD 형식이어야 합니다.")
    .refine((v) => v >= todayYmdJst(), {
      message: "발송예정일은 오늘 이후여야 합니다 (JST).",
    }),
  delayType: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

const listShippingQuery = z.object({
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
  dateField: z.enum(["orderedAt", "paidAt", "shippedAt"]).default("shippedAt"),
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
    .default("shippedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export async function shippingRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/shipping — 배송관리 페이지 전용 목록
  app.get(
    "/shipping",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = listShippingQuery.safeParse(request.query);
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

      const [items, totalRow, rankRows, claimRow, allRow, carrierRows] =
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
            .select({ n: sql<number>`count(*)::int` })
            .from(orders)
            .where(and(...baseConds, isNotNull(orders.claimStatus))),
          app.db
            .select({ n: sql<number>`count(*)::int` })
            .from(orders)
            .where(and(...baseConds)),
          app.db
            .select({
              carrier: orders.trackingCarrier,
              n: sql<number>`count(*)::int`,
            })
            .from(orders)
            .where(and(...baseConds, isNotNull(orders.trackingCarrier)))
            .groupBy(orders.trackingCarrier),
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

      const shippedCount = counts["50"] ?? 0;
      const inTransitCount = counts["60"] ?? 0;
      const deliveredCount = counts["70"] ?? 0;
      const totalForRate = shippedCount + inTransitCount + deliveredCount;
      const deliveredRate =
        totalForRate > 0
          ? Math.round((deliveredCount / totalForRate) * 1000) / 10
          : 0;

      const byCarrier = carrierRows
        .filter((r): r is { carrier: string; n: number } => Boolean(r.carrier))
        .map((r) => ({ carrier: r.carrier, count: r.n }))
        .sort((a, b) => b.count - a.count);

      return {
        items,
        total: totalRow[0]?.n ?? 0,
        counts,
        shippingSummary: {
          shippedCount,
          inTransitCount,
          deliveredCount,
          deliveredRate,
          byCarrier,
        },
      };
    },
  );

  // POST /api/shipping/dispatch-delay — 발송예정일 변경 (배송지연)
  // 결제완료/신규주문/출고대기/보류/출력 단계 주문 대상.
  // Qoo10: SetSellerCheckYNBulk(EstShipDt + DelayType) — rank 10 → 20 전환 포함.
  // Shopify: DB shippingDueDate 만 갱신 (push API 없음).
  app.post(
    "/shipping/dispatch-delay",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = dispatchDelayBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        const svc = new OrderService(app);
        const result = await svc.pushDispatchDelay({
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
            : "발송예정일 변경 중 오류가 발생했습니다.";
        return reply
          .status(500)
          .send({ error: "DISPATCH_DELAY_FAILED", message });
      }
    },
  );

  // POST /api/shipping/send-bulk — 운송장 일괄 등록 (출고대기/보류/출력 → 출고완료)
  // Qoo10: SetSendingInfoBulk(15773) 호출. Shopify: fulfillmentCreate per-order 순차 호출.
  app.post(
    "/shipping/send-bulk",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = sendShippingBulkBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }

      try {
        const svc = new OrderService(app);
        const result = await svc.setShippingInfo({
          userId: request.user.userId,
          items: parsed.data.items,
        });
        return result;
      } catch (err: unknown) {
        app.log.error(err);
        const message =
          err instanceof Error
            ? err.message
            : "운송장 전송 중 오류가 발생했습니다.";
        return reply.status(500).send({ error: "SEND_FAILED", message });
      }
    },
  );
}
