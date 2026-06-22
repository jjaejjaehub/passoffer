import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gte, lte, lt, sql } from "drizzle-orm";
import { channels, orderEventLog, orders } from "../../db/schema";

const EVENT_TYPES = [
  "auto_match_success",
  "auto_match_failed",
  "duplicate_suspect",
  "status_sync",
  "collect_error",
] as const;

const RESULTS = ["ok", "warn", "error"] as const;

const listQuery = z.object({
  eventType: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter((s): s is (typeof EVENT_TYPES)[number] =>
              (EVENT_TYPES as readonly string[]).includes(s),
            )
        : undefined,
    ),
  result: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter((s): s is (typeof RESULTS)[number] =>
              (RESULTS as readonly string[]).includes(s),
            )
        : undefined,
    ),
  channelId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  cursor: z.string().datetime().optional(),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});

const csvQuery = listQuery
  .omit({ cursor: true, pageSize: true })
  .extend({
    limit: z.coerce.number().int().positive().max(50000).default(10000),
  });

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function orderEventLogRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/order-event-logs — 페이지네이션 조회 (cursor: createdAt desc)
  app.get(
    "/order-event-logs",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = listQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_QUERY", details: parsed.error.flatten() });
      }
      const {
        eventType,
        result,
        channelId,
        orderId,
        dateFrom,
        dateTo,
        cursor,
        pageSize,
      } = parsed.data;
      const userId = request.user.userId;

      const conds = [eq(orderEventLog.userId, userId)];
      if (eventType && eventType.length > 0) {
        conds.push(
          sql`${orderEventLog.eventType} = ANY(${sql.raw(
            `ARRAY[${eventType.map((e) => `'${e}'`).join(",")}]::order_event_log_type[]`,
          )})`,
        );
      }
      if (result && result.length > 0) {
        conds.push(
          sql`${orderEventLog.result} = ANY(${sql.raw(
            `ARRAY[${result.map((r) => `'${r}'`).join(",")}]::order_event_log_result[]`,
          )})`,
        );
      }
      if (channelId) conds.push(eq(orderEventLog.channelId, channelId));
      if (orderId) conds.push(eq(orderEventLog.orderId, orderId));
      if (dateFrom)
        conds.push(gte(orderEventLog.createdAt, new Date(dateFrom)));
      if (dateTo) conds.push(lte(orderEventLog.createdAt, new Date(dateTo)));
      if (cursor) conds.push(lt(orderEventLog.createdAt, new Date(cursor)));

      const rows = await app.db
        .select({
          id: orderEventLog.id,
          userId: orderEventLog.userId,
          channelId: orderEventLog.channelId,
          orderId: orderEventLog.orderId,
          orderItemId: orderEventLog.orderItemId,
          eventType: orderEventLog.eventType,
          result: orderEventLog.result,
          message: orderEventLog.message,
          detail: orderEventLog.detail,
          createdAt: orderEventLog.createdAt,
          channelName: channels.name,
          channelOrderId: orders.channelOrderId,
        })
        .from(orderEventLog)
        .leftJoin(channels, eq(orderEventLog.channelId, channels.id))
        .leftJoin(orders, eq(orderEventLog.orderId, orders.id))
        .where(and(...conds))
        .orderBy(desc(orderEventLog.createdAt))
        .limit(pageSize + 1);

      const hasMore = rows.length > pageSize;
      const items = hasMore ? rows.slice(0, pageSize) : rows;
      const nextCursor = hasMore
        ? items[items.length - 1]?.createdAt.toISOString()
        : null;

      return { items, nextCursor };
    },
  );

  // GET /api/order-event-logs.csv — 운영 디버깅용 CSV 다운로드
  app.get(
    "/order-event-logs.csv",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = csvQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_QUERY", details: parsed.error.flatten() });
      }
      const { eventType, result, channelId, orderId, dateFrom, dateTo, limit } =
        parsed.data;
      const userId = request.user.userId;

      const conds = [eq(orderEventLog.userId, userId)];
      if (eventType && eventType.length > 0) {
        conds.push(
          sql`${orderEventLog.eventType} = ANY(${sql.raw(
            `ARRAY[${eventType.map((e) => `'${e}'`).join(",")}]::order_event_log_type[]`,
          )})`,
        );
      }
      if (result && result.length > 0) {
        conds.push(
          sql`${orderEventLog.result} = ANY(${sql.raw(
            `ARRAY[${result.map((r) => `'${r}'`).join(",")}]::order_event_log_result[]`,
          )})`,
        );
      }
      if (channelId) conds.push(eq(orderEventLog.channelId, channelId));
      if (orderId) conds.push(eq(orderEventLog.orderId, orderId));
      if (dateFrom)
        conds.push(gte(orderEventLog.createdAt, new Date(dateFrom)));
      if (dateTo) conds.push(lte(orderEventLog.createdAt, new Date(dateTo)));

      const rows = await app.db
        .select({
          createdAt: orderEventLog.createdAt,
          eventType: orderEventLog.eventType,
          result: orderEventLog.result,
          channelName: channels.name,
          channelOrderId: orders.channelOrderId,
          orderId: orderEventLog.orderId,
          orderItemId: orderEventLog.orderItemId,
          message: orderEventLog.message,
          detail: orderEventLog.detail,
        })
        .from(orderEventLog)
        .leftJoin(channels, eq(orderEventLog.channelId, channels.id))
        .leftJoin(orders, eq(orderEventLog.orderId, orders.id))
        .where(and(...conds))
        .orderBy(desc(orderEventLog.createdAt))
        .limit(limit);

      const header = [
        "created_at",
        "event_type",
        "result",
        "channel_name",
        "channel_order_id",
        "order_id",
        "order_item_id",
        "message",
        "detail",
      ].join(",");

      const lines = [header];
      for (const r of rows) {
        lines.push(
          [
            r.createdAt.toISOString(),
            r.eventType,
            r.result,
            r.channelName ?? "",
            r.channelOrderId ?? "",
            r.orderId ?? "",
            r.orderItemId ?? "",
            r.message ?? "",
            r.detail ?? "",
          ]
            .map(escapeCsv)
            .join(","),
        );
      }

      const filename = `order-event-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${filename}"`);
      return `﻿${lines.join("\n")}\n`;
    },
  );
}
