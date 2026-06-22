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
import { ChannelService } from "../../services/ChannelService";
import { OrderService } from "../../services/OrderService";
import {
  orders,
  orderItems,
  masterProductVariants,
  masterProducts,
  skus,
} from "../../db/schema";

// fulfillment rank → 의미 키 매핑 (counts 응답용)
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
  // SKU 매칭 탭 필터
  autoMatched: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  matchedBy: z.enum(["auto", "manual", "rule"]).optional(),
  matchState: z.enum(["unmatched", "partial", "fully"]).optional(),
  duplicateOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

const DUPLICATE_LOOKBACK_DAYS = 30;

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

const collectOrdersBody = z.object({
  channelIds: z.array(z.string().uuid()).min(1),
  sinceDate: z.string().datetime(),
  untilDate: z.string().datetime().optional(),
});

const syncOrdersBody = z.object({
  channelIds: z.array(z.string().uuid()).min(1),
  sinceDate: z.string().datetime(),
  untilDate: z.string().datetime().optional(),
});

const quickCollectBody = z.object({
  channelIds: z.array(z.string().uuid()).optional(),
});

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/orders — A안: { items, total, counts(전체 분포) }
  // counts 는 status 필터와 무관하게 항상 dateField/channelId 조건만 적용된 전체 분포를 반환.
  app.get(
    "/orders",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = listOrdersQuery.safeParse(request.query);
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
        autoMatched,
        matchedBy,
        matchState,
        duplicateOnly,
      } = parsed.data;
      const userId = request.user.userId;
      const dupLookbackCutoff = new Date(
        Date.now() - DUPLICATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
      );

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
      if (autoMatched !== undefined) {
        itemsConds.push(eq(orders.autoMatched, autoMatched));
      }
      if (matchedBy) {
        itemsConds.push(eq(orders.matchedBy, matchedBy));
      }
      // matchState 필터 — orderItems 의 skuId NULL 분포 기반
      // unmatched: 모든 items.skuId IS NULL
      // partial:   일부 items.skuId IS NULL, 일부 NOT NULL
      // fully:     모든 items.skuId IS NOT NULL
      if (matchState) {
        const matchedCountSql = sql<number>`(
        SELECT count(*)::int FROM ${orderItems}
        WHERE ${orderItems.orderId} = ${orders.id}
          AND ${orderItems.skuId} IS NOT NULL
      )`;
        const totalCountSql = sql<number>`(
        SELECT count(*)::int FROM ${orderItems}
        WHERE ${orderItems.orderId} = ${orders.id}
      )`;
        if (matchState === "unmatched") {
          itemsConds.push(sql`${matchedCountSql} = 0 AND ${totalCountSql} > 0`);
        } else if (matchState === "fully") {
          itemsConds.push(
            sql`${matchedCountSql} = ${totalCountSql} AND ${totalCountSql} > 0`,
          );
        } else if (matchState === "partial") {
          itemsConds.push(
            sql`${matchedCountSql} > 0 AND ${matchedCountSql} < ${totalCountSql}`,
          );
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
      const orderBy = sortDir === "asc" ? asc(orderByCol) : desc(orderByCol);

      const [rawItems, totalRow, rankRows, holdRows, claimRow, allRow] =
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
      // 의미 키 0 초기화 (rankRows 가 비어도 응답 키 보장)
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

      // duplicateGroupKey 별 같은 유저 30일 윈도우 카운트 (페이지 결과에 머지)
      const dupKeys = Array.from(
        new Set(
          rawItems
            .map((r) => r.duplicateGroupKey)
            .filter((k): k is string => typeof k === "string" && k.length > 0),
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

      const items = rawItems.map((row) => ({
        ...row,
        duplicateCount: row.duplicateGroupKey
          ? (dupCountMap.get(row.duplicateGroupKey) ?? null)
          : null,
      }));

      return {
        items,
        total: totalRow[0]?.n ?? 0,
        counts,
      };
    },
  );

  // GET /api/orders/channel/:channelId — 외부 채널 어댑터를 거친 라이브 조회 (옛 GET /orders 자리)
  app.get<{ Params: { channelId: string } }>(
    "/orders/channel/:channelId",
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
        return reply
          .status(400)
          .send({ error: "INVALID_QUERY", details: query.error.flatten() });
      }
      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(request.params.channelId);
      if (!adapter.getOrders) {
        return reply
          .status(501)
          .send({
            error: "NOT_SUPPORTED",
            message: "이 채널은 주문 조회를 지원하지 않습니다.",
          });
      }
      const result = await adapter.getOrders(query.data);
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
            shippingDueDate: shipDateValue,
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
            shipDate: orders.shippingDueDate,
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
        .set({ claimStatus: "cancel_done", claimType: "cancel" })
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

  // POST /api/orders/collect — 채널 다중 수집 (DB upsert + SKU 자동매칭)
  app.post(
    "/orders/collect",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = collectOrdersBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        const svc = new OrderService(app);
        const result = await svc.collectOrders({
          userId: request.user.userId,
          channelIds: parsed.data.channelIds,
          sinceDate: parsed.data.sinceDate,
          untilDate: parsed.data.untilDate,
        });
        return result;
      } catch (err: unknown) {
        app.log.error(err);
        const message =
          err instanceof Error
            ? err.message
            : "주문 수집 중 오류가 발생했습니다.";
        return reply.status(500).send({ error: "COLLECT_FAILED", message });
      }
    },
  );

  // POST /api/orders/sync — 채널 다중 동기화 (rank 단조증가 가드)
  app.post(
    "/orders/sync",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = syncOrdersBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        const svc = new OrderService(app);
        const result = await svc.syncOrders({
          userId: request.user.userId,
          channelIds: parsed.data.channelIds,
          sinceDate: parsed.data.sinceDate,
          untilDate: parsed.data.untilDate,
        });
        return result;
      } catch (err: unknown) {
        app.log.error(err);
        const message =
          err instanceof Error
            ? err.message
            : "주문 동기화 중 오류가 발생했습니다.";
        return reply.status(500).send({ error: "SYNC_FAILED", message });
      }
    },
  );

  // POST /api/orders/quick-collect — 전역 퀵수집: user_settings.lookbackDays 기반 수집+동기화 일괄
  app.post(
    "/orders/quick-collect",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = quickCollectBody.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      try {
        const svc = new OrderService(app);
        const result = await svc.quickCollect({
          userId: request.user.userId,
          channelIds: parsed.data.channelIds,
        });
        return result;
      } catch (err: unknown) {
        app.log.error(err);
        const message =
          err instanceof Error ? err.message : "퀵수집 중 오류가 발생했습니다.";
        return reply
          .status(500)
          .send({ error: "QUICK_COLLECT_FAILED", message });
      }
    },
  );

  // GET /api/orders/:orderId/items — SKU 매칭 워크스페이스용 라인아이템 + 현재 SKU 상태
  app.get<{ Params: { orderId: string } }>(
    "/orders/:orderId/items",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.userId;
      const { orderId } = request.params;

      const [ownerRow] = await app.db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
        .limit(1);
      if (!ownerRow) {
        return reply.status(404).send({ error: "ORDER_NOT_FOUND" });
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
          skuId: orderItems.skuId,
          skuCode: orderItems.skuCode,
          skuName: orderItems.skuName,
          outputQty: orderItems.outputQty,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      return { items: rows };
    },
  );

  // PATCH /api/orders/:orderId/items/:itemId/sku — 단건 SKU 수동 매칭
  app.patch<{ Params: { orderId: string; itemId: string } }>(
    "/orders/:orderId/items/:itemId/sku",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = z
        .object({
          skuId: z.string().uuid().nullable(),
          outputQty: z.number().int().min(0).optional(),
        })
        .safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      const userId = request.user.userId;
      const { orderId, itemId } = request.params;
      const { skuId, outputQty } = parsed.data;

      try {
        const result = await applySingleSkuMatch(app, {
          userId,
          orderId,
          itemId,
          skuId,
          outputQty,
        });
        return result;
      } catch (err: unknown) {
        const code =
          err instanceof Error && "code" in err
            ? (err as { code: string }).code
            : null;
        if (code === "ORDER_ITEM_NOT_FOUND") {
          return reply.status(404).send({ error: "ORDER_ITEM_NOT_FOUND" });
        }
        if (code === "SKU_NOT_FOUND") {
          return reply.status(404).send({ error: "SKU_NOT_FOUND" });
        }
        app.log.error(err);
        const message =
          err instanceof Error
            ? err.message
            : "SKU 매칭 중 오류가 발생했습니다.";
        return reply.status(500).send({ error: "SKU_MATCH_FAILED", message });
      }
    },
  );

  // POST /api/orders/items/bulk-sku — 다건 SKU 수동 매칭
  app.post(
    "/orders/items/bulk-sku",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = z
        .object({
          items: z
            .array(
              z.object({
                orderId: z.string().uuid(),
                itemId: z.string().uuid(),
                skuId: z.string().uuid().nullable(),
                outputQty: z.number().int().min(0).optional(),
              }),
            )
            .min(1)
            .max(500),
        })
        .safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }

      const userId = request.user.userId;
      const failed: Array<{ itemId: string; reason: string }> = [];
      let ok = 0;
      for (const it of parsed.data.items) {
        try {
          await applySingleSkuMatch(app, {
            userId,
            orderId: it.orderId,
            itemId: it.itemId,
            skuId: it.skuId,
            outputQty: it.outputQty,
          });
          ok += 1;
        } catch (err) {
          const reason =
            err instanceof Error && "code" in err
              ? (err as { code: string }).code
              : err instanceof Error
                ? err.message
                : "UNKNOWN";
          failed.push({ itemId: it.itemId, reason });
        }
      }
      return { ok, failed, totalRequested: parsed.data.items.length };
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

/**
 * 단건 SKU 수동 매칭 — orderItem 의 skuId/skuCode/skuName 갱신,
 * 부모 order 의 matchedBy='manual', autoMatched 재계산.
 * 에러는 code 프로퍼티(ORDER_ITEM_NOT_FOUND / SKU_NOT_FOUND)로 식별.
 */
async function applySingleSkuMatch(
  app: FastifyInstance,
  params: {
    userId: string;
    orderId: string;
    itemId: string;
    skuId: string | null;
    outputQty?: number;
  },
): Promise<{
  ok: true;
  orderId: string;
  itemId: string;
  autoMatched: boolean;
}> {
  const { userId, orderId, itemId, skuId, outputQty } = params;

  // 1) orderItem 이 본인 userId 소속인지 검증 (order join)
  const [row] = await app.db
    .select({
      itemId: orderItems.id,
      orderId: orderItems.orderId,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.id, itemId),
        eq(orderItems.orderId, orderId),
        eq(orders.userId, userId),
      ),
    )
    .limit(1);
  if (!row) {
    const err = new Error("order item not found") as Error & { code: string };
    err.code = "ORDER_ITEM_NOT_FOUND";
    throw err;
  }

  // 2) skuId 가 제공되면 본인 SKU 인지 검증 + code/name 조회
  let skuCode: string | null = null;
  let skuName: string | null = null;
  if (skuId) {
    const [s] = await app.db
      .select({ id: skus.id, code: skus.code, name: skus.name })
      .from(skus)
      .where(and(eq(skus.id, skuId), eq(skus.userId, userId)))
      .limit(1);
    if (!s) {
      const err = new Error("sku not found") as Error & { code: string };
      err.code = "SKU_NOT_FOUND";
      throw err;
    }
    skuCode = s.code;
    skuName = s.name;
  }

  // 3) orderItem 갱신
  const patch: Record<string, unknown> = {
    skuId: skuId,
    skuCode: skuCode,
    skuName: skuName,
  };
  if (outputQty !== undefined) patch.outputQty = outputQty;
  await app.db.update(orderItems).set(patch).where(eq(orderItems.id, itemId));

  // 4) 부모 order — autoMatched 재계산 + matchedBy='manual'
  const itemsAll = await app.db
    .select({ id: orderItems.id, skuId: orderItems.skuId })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const total = itemsAll.length;
  const matched = itemsAll.filter((i) => i.skuId).length;
  const autoMatched = total > 0 && matched === total;

  await app.db
    .update(orders)
    .set({ autoMatched, matchedBy: "manual", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  return { ok: true, orderId, itemId, autoMatched };
}
