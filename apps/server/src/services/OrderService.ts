import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type {
  FulfillmentRank,
  IOrderAdapter,
  StandardOrder,
  StandardOrderItem,
} from "@oms/types";
import {
  channels,
  DEFAULT_USER_ORDER_SETTINGS,
  orderEventLog,
  orders,
  orderItems,
  orderStatusHistory,
  skus,
  userSettings,
} from "../db/schema";
import { QOO10OrderAdapter } from "../adapters/qoo10/QOO10OrderAdapter";
import { ShopifyOrderAdapter } from "../adapters/shopify/ShopifyOrderAdapter";
import { ChannelService } from "./ChannelService";
import { GiftRuleService } from "./GiftRuleService";
import { MatchingRuleService } from "./MatchingRuleService";
import { StatusRuleEngine, type ChannelKey } from "./StatusRuleEngine";

type DbLike = FastifyInstance["db"];

interface UserOrderSettings {
  lookbackDays: number;
  autoMatchSku: boolean;
  dispatchDelayThresholdDays: number;
  bundleKey: string[];
}

export interface CollectParams {
  userId: string;
  channelIds: string[];
  sinceDate: string; // ISO
  untilDate?: string;
}

export interface SyncParams {
  userId: string;
  channelIds: string[];
  sinceDate: string;
  untilDate?: string;
}

export interface QuickCollectParams {
  userId: string;
  channelIds?: string[];
}

export interface ChannelOpResult {
  channelId: string;
  channelKey: ChannelKey;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ channelOrderId: string; message: string }>;
}

export interface CollectResult {
  totalProcessed: number;
  totalInserted: number;
  totalUpdated: number;
  channels: ChannelOpResult[];
}

export interface SyncResult {
  totalProcessed: number;
  totalUpdated: number;
  totalSkipped: number;
  channels: ChannelOpResult[];
}

export class OrderService {
  constructor(private readonly app: FastifyInstance) {}

  // ── public API ────────────────────────────────────────────────

  async collectOrders(params: CollectParams): Promise<CollectResult> {
    const settings = await this.loadUserOrderSettings(params.userId);
    const channelRows = await this.loadChannels(params.userId, params.channelIds);

    const results: ChannelOpResult[] = [];
    for (const row of channelRows) {
      const channelKey = this.channelTypeToKey(row.channelType);
      if (!channelKey) continue;

      const result: ChannelOpResult = {
        channelId: row.id,
        channelKey,
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      try {
        const adapter = await this.buildAdapter(params.userId, row.id, channelKey);
        if (!adapter) {
          result.errors.push({ channelOrderId: "", message: "adapter_unavailable" });
          await this.logEvent(this.app.db, {
            userId: params.userId,
            channelId: row.id,
            orderId: null,
            orderItemId: null,
            eventType: "collect_error",
            result: "error",
            message: "어댑터 사용 불가 (자격증명 확인 필요)",
            detail: { channelKey, phase: "build_adapter" },
          });
          results.push(result);
          continue;
        }
        const pulled = await adapter.pullOrders({
          sinceDate: params.sinceDate,
          untilDate: params.untilDate,
        });
        this.app.log.info(
          {
            phase: "collect_pull",
            channelId: row.id,
            channelKey,
            pulled: pulled.length,
            sinceDate: params.sinceDate,
            untilDate: params.untilDate,
          },
          "collectOrders pulled",
        );
        for (const std of pulled) {
          result.processed += 1;
          try {
            const upsertResult = await this.upsertOrder(
              params.userId,
              row.id,
              std,
              settings,
            );
            if (upsertResult === "inserted") result.inserted += 1;
            else if (upsertResult === "updated") result.updated += 1;
            else result.skipped += 1;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            result.errors.push({
              channelOrderId: std.channelOrderId,
              message,
            });
            await this.logEvent(this.app.db, {
              userId: params.userId,
              channelId: row.id,
              orderId: null,
              orderItemId: null,
              eventType: "collect_error",
              result: "error",
              message: `주문 upsert 실패 (${std.channelOrderId}): ${message}`,
              detail: {
                channelKey,
                phase: "upsert",
                channelOrderId: std.channelOrderId,
              },
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({
          channelOrderId: "",
          message,
        });
        await this.logEvent(this.app.db, {
          userId: params.userId,
          channelId: row.id,
          orderId: null,
          orderItemId: null,
          eventType: "collect_error",
          result: "error",
          message: `수집 실패: ${message}`,
          detail: { channelKey, phase: "pull" },
        });
      }
      results.push(result);
    }

    return {
      totalProcessed: results.reduce((a, r) => a + r.processed, 0),
      totalInserted: results.reduce((a, r) => a + r.inserted, 0),
      totalUpdated: results.reduce((a, r) => a + r.updated, 0),
      channels: results,
    };
  }

  async syncOrders(params: SyncParams): Promise<SyncResult> {
    const channelRows = await this.loadChannels(params.userId, params.channelIds);
    const results: ChannelOpResult[] = [];

    for (const row of channelRows) {
      const channelKey = this.channelTypeToKey(row.channelType);
      if (!channelKey) continue;

      const result: ChannelOpResult = {
        channelId: row.id,
        channelKey,
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      try {
        const adapter = await this.buildAdapter(params.userId, row.id, channelKey);
        if (!adapter) {
          result.errors.push({ channelOrderId: "", message: "adapter_unavailable" });
          await this.logEvent(this.app.db, {
            userId: params.userId,
            channelId: row.id,
            orderId: null,
            orderItemId: null,
            eventType: "collect_error",
            result: "error",
            message: "어댑터 사용 불가 (동기화 단계)",
            detail: { channelKey, phase: "sync_build_adapter" },
          });
          results.push(result);
          continue;
        }
        const pulled = await adapter.pullOrders({
          sinceDate: params.sinceDate,
          untilDate: params.untilDate,
        });
        for (const std of pulled) {
          result.processed += 1;
          try {
            const changed = await this.syncOne(params.userId, row.id, std, channelKey);
            if (changed) result.updated += 1;
            else result.skipped += 1;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            result.errors.push({
              channelOrderId: std.channelOrderId,
              message,
            });
            await this.logEvent(this.app.db, {
              userId: params.userId,
              channelId: row.id,
              orderId: null,
              orderItemId: null,
              eventType: "collect_error",
              result: "error",
              message: `동기화 실패 (${std.channelOrderId}): ${message}`,
              detail: {
                channelKey,
                phase: "sync_one",
                channelOrderId: std.channelOrderId,
              },
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({
          channelOrderId: "",
          message,
        });
        await this.logEvent(this.app.db, {
          userId: params.userId,
          channelId: row.id,
          orderId: null,
          orderItemId: null,
          eventType: "collect_error",
          result: "error",
          message: `동기화 실패: ${message}`,
          detail: { channelKey, phase: "sync_pull" },
        });
      }
      results.push(result);
    }

    return {
      totalProcessed: results.reduce((a, r) => a + r.processed, 0),
      totalUpdated: results.reduce((a, r) => a + r.updated, 0),
      totalSkipped: results.reduce((a, r) => a + r.skipped, 0),
      channels: results,
    };
  }

  // ── confirmOrders — 결제완료(10) → 신규주문(20) 전환 + Qoo10 SetSellerCheckYNBulk push ──
  // 동일 채널 묶음만 처리. 항상 Bulk API 사용, 500건 초과 시 청크 분할.
  async confirmOrders(params: {
    userId: string;
    orderIds: string[];
    estimatedShippingDate: string; // YYYY-MM-DD JST
    delayType?: 1 | 2 | 3 | 4;
  }): Promise<{
    totalRequested: number;
    totalConfirmed: number;
    totalFailed: number;
    skipped: number;
    results: Array<{
      orderId: string;
      channelOrderId: string;
      ok: boolean;
      message?: string;
    }>;
  }> {
    const db: DbLike = this.app.db;
    if (params.orderIds.length === 0) {
      return {
        totalRequested: 0,
        totalConfirmed: 0,
        totalFailed: 0,
        skipped: 0,
        results: [],
      };
    }

    // 대상 주문 로드 (rank 10 + 동일 user)
    const rows = await db
      .select({
        id: orders.id,
        channelId: orders.channelId,
        channelOrderId: orders.channelOrderId,
        fulfillmentStatus: orders.fulfillmentStatus,
        channelType: channels.channelType,
      })
      .from(orders)
      .innerJoin(channels, eq(channels.id, orders.channelId))
      .where(
        and(
          eq(orders.userId, params.userId),
          inArray(orders.id, params.orderIds),
        ),
      );

    const eligible = rows.filter((r) => r.fulfillmentStatus === 10);
    const skipped = rows.length - eligible.length;

    // 채널별로 그룹핑
    const byChannel = new Map<string, typeof eligible>();
    for (const r of eligible) {
      const list = byChannel.get(r.channelId) ?? [];
      list.push(r);
      byChannel.set(r.channelId, list);
    }

    const allResults: Array<{
      orderId: string;
      channelOrderId: string;
      ok: boolean;
      message?: string;
    }> = [];

    for (const [channelId, group] of byChannel) {
      const channelKey = this.channelTypeToKey(group[0]?.channelType);
      if (!channelKey) {
        for (const r of group) {
          allResults.push({
            orderId: r.id,
            channelOrderId: r.channelOrderId,
            ok: false,
            message: "unsupported_channel",
          });
        }
        continue;
      }

      // Shopify는 주문확인 개념 없음 → 즉시 rank 전환만 수행
      if (channelKey === "shopify") {
        for (const r of group) {
          await this.transitionPaidToNew(r.id, channelId, "shopify_auto_confirm");
          allResults.push({
            orderId: r.id,
            channelOrderId: r.channelOrderId,
            ok: true,
            message: "shopify_no_confirm_needed",
          });
        }
        continue;
      }

      const adapter = await this.buildAdapter(params.userId, channelId, channelKey);
      if (!adapter || !adapter.confirmOrders) {
        for (const r of group) {
          allResults.push({
            orderId: r.id,
            channelOrderId: r.channelOrderId,
            ok: false,
            message: "adapter_unavailable",
          });
        }
        continue;
      }

      // 500건씩 청크 분할
      const CHUNK = 500;
      for (let i = 0; i < group.length; i += CHUNK) {
        const chunk = group.slice(i, i + CHUNK);
        const channelOrderIds = chunk.map((r) => r.channelOrderId);
        try {
          const pushResults = await adapter.confirmOrders({
            channelOrderIds,
            estimatedShippingDate: params.estimatedShippingDate,
            delayType: params.delayType ?? 1,
          });
          // 결과 매핑 — channelOrderId 기준
          const byCoid = new Map(pushResults.map((p) => [p.channelOrderId, p]));
          for (const r of chunk) {
            const pr = byCoid.get(r.channelOrderId);
            const ok = pr?.ok === true;
            if (ok) {
              await this.transitionPaidToNew(
                r.id,
                channelId,
                "qoo10_seller_check",
              );
            }
            allResults.push({
              orderId: r.id,
              channelOrderId: r.channelOrderId,
              ok,
              message: pr?.message ?? (ok ? undefined : "no_result"),
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          for (const r of chunk) {
            allResults.push({
              orderId: r.id,
              channelOrderId: r.channelOrderId,
              ok: false,
              message,
            });
          }
          await this.logEvent(db, {
            userId: params.userId,
            channelId,
            orderId: null,
            orderItemId: null,
            eventType: "collect_error",
            result: "error",
            message: `confirmOrders 실패: ${message}`,
            detail: {
              channelKey,
              phase: "confirm_bulk",
              count: chunk.length,
              estimatedShippingDate: params.estimatedShippingDate,
            },
          });
        }
      }
    }

    const totalConfirmed = allResults.filter((r) => r.ok).length;
    const totalFailed = allResults.filter((r) => !r.ok).length;
    return {
      totalRequested: params.orderIds.length,
      totalConfirmed,
      totalFailed,
      skipped,
      results: allResults,
    };
  }

  private async transitionPaidToNew(
    orderId: string,
    channelId: string,
    reason: string,
  ): Promise<void> {
    const db: DbLike = this.app.db;
    await db.transaction(async (tx) => {
      const txDb = tx as unknown as DbLike;
      await txDb
        .update(orders)
        .set({ fulfillmentStatus: 20, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
      await txDb.insert(orderStatusHistory).values({
        orderId,
        fromFulfillment: 10,
        toFulfillment: 20,
        actor: "user",
        actorId: channelId,
        reason,
      });
    });
  }

  // ── pushDispatchDelay — 발송예정일 변경 (배송지연 액션) ──
  // 결제완료(10)/신규주문(20)/출고대기(30)/보류(35)/출력(40) 대상.
  // Qoo10: SetSellerCheckYNBulk(EstShipDt + DelayType) 사용 — 발주확인을 겸함.
  //        rank 10 → 20 자동 전환. rank 20~40 은 상태 유지하고 shippingDueDate만 갱신.
  // Shopify: 발송예정일 push API 없음 → DB shippingDueDate 만 갱신 (channel_unsupported 표시).
  async pushDispatchDelay(params: {
    userId: string;
    orderIds: string[];
    estimatedShippingDate: string; // YYYY-MM-DD JST
    delayType: 1 | 2 | 3 | 4;
  }): Promise<{
    totalRequested: number;
    totalUpdated: number;
    totalFailed: number;
    skipped: number;
    results: Array<{
      orderId: string;
      channelOrderId: string;
      ok: boolean;
      message?: string;
    }>;
  }> {
    const db: DbLike = this.app.db;
    if (params.orderIds.length === 0) {
      return {
        totalRequested: 0,
        totalUpdated: 0,
        totalFailed: 0,
        skipped: 0,
        results: [],
      };
    }
    if (![1, 2, 3, 4].includes(params.delayType)) {
      throw new Error(`delayType must be 1~4, got ${params.delayType}`);
    }

    // 대상 주문 로드 — rank 10~40 만 허용 (출고완료 50 이후는 의미 없음)
    const ELIGIBLE_RANKS = [10, 20, 30, 35, 40];
    const rows = await db
      .select({
        id: orders.id,
        channelId: orders.channelId,
        channelOrderId: orders.channelOrderId,
        fulfillmentStatus: orders.fulfillmentStatus,
        channelType: channels.channelType,
      })
      .from(orders)
      .innerJoin(channels, eq(channels.id, orders.channelId))
      .where(
        and(
          eq(orders.userId, params.userId),
          inArray(orders.id, params.orderIds),
        ),
      );

    const eligible = rows.filter((r) =>
      ELIGIBLE_RANKS.includes(r.fulfillmentStatus),
    );
    const skipped = rows.length - eligible.length;

    const byChannel = new Map<string, typeof eligible>();
    for (const r of eligible) {
      const list = byChannel.get(r.channelId) ?? [];
      list.push(r);
      byChannel.set(r.channelId, list);
    }

    const allResults: Array<{
      orderId: string;
      channelOrderId: string;
      ok: boolean;
      message?: string;
    }> = [];

    const dueDate = new Date(`${params.estimatedShippingDate}T00:00:00+09:00`);

    for (const [channelId, group] of byChannel) {
      const channelKey = this.channelTypeToKey(group[0]?.channelType);
      if (!channelKey) {
        for (const r of group) {
          allResults.push({
            orderId: r.id,
            channelOrderId: r.channelOrderId,
            ok: false,
            message: "unsupported_channel",
          });
        }
        continue;
      }

      // Shopify는 발송예정일 push 미지원 → DB만 갱신
      if (channelKey === "shopify") {
        for (const r of group) {
          await db
            .update(orders)
            .set({ shippingDueDate: dueDate, updatedAt: new Date() })
            .where(eq(orders.id, r.id));
          allResults.push({
            orderId: r.id,
            channelOrderId: r.channelOrderId,
            ok: true,
            message: "shopify_local_only",
          });
        }
        continue;
      }

      const adapter = await this.buildAdapter(
        params.userId,
        channelId,
        channelKey,
      );
      if (!adapter) {
        for (const r of group) {
          allResults.push({
            orderId: r.id,
            channelOrderId: r.channelOrderId,
            ok: false,
            message: "adapter_unavailable",
          });
        }
        continue;
      }

      const CHUNK = 500;
      for (let i = 0; i < group.length; i += CHUNK) {
        const chunk = group.slice(i, i + CHUNK);
        const channelOrderIds = chunk.map((r) => r.channelOrderId);
        try {
          const pushResults = await adapter.pushDispatchDelay({
            channelOrderIds,
            estimatedShippingDate: params.estimatedShippingDate,
            delayType: params.delayType,
          });
          const byCoid = new Map(pushResults.map((p) => [p.channelOrderId, p]));
          for (const r of chunk) {
            const pr = byCoid.get(r.channelOrderId);
            const ok = pr?.ok === true;
            if (ok) {
              await db
                .update(orders)
                .set({ shippingDueDate: dueDate, updatedAt: new Date() })
                .where(eq(orders.id, r.id));
              // rank 10 → 20 자동 전환 (Qoo10 SetSellerCheckYN 효과)
              if (r.fulfillmentStatus === 10) {
                await this.transitionPaidToNew(
                  r.id,
                  channelId,
                  "qoo10_dispatch_delay",
                );
              }
            }
            allResults.push({
              orderId: r.id,
              channelOrderId: r.channelOrderId,
              ok,
              message: pr?.message ?? (ok ? undefined : "no_result"),
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          for (const r of chunk) {
            allResults.push({
              orderId: r.id,
              channelOrderId: r.channelOrderId,
              ok: false,
              message,
            });
          }
          await this.logEvent(db, {
            userId: params.userId,
            channelId,
            orderId: null,
            orderItemId: null,
            eventType: "collect_error",
            result: "error",
            message: `pushDispatchDelay 실패: ${message}`,
            detail: {
              channelKey,
              phase: "dispatch_delay_bulk",
              count: chunk.length,
              estimatedShippingDate: params.estimatedShippingDate,
              delayType: params.delayType,
            },
          });
        }
      }
    }

    const totalUpdated = allResults.filter((r) => r.ok).length;
    const totalFailed = allResults.filter((r) => !r.ok).length;
    return {
      totalRequested: params.orderIds.length,
      totalUpdated,
      totalFailed,
      skipped,
      results: allResults,
    };
  }

  // ── setShippingInfo — 운송장 일괄 등록 (30/35/40 → 50 출고완료) ──
  // 동일 채널 묶음으로 처리. Qoo10은 SetSendingInfoBulk(15773) 500건/호출.
  // Shopify는 FulfillmentOrder(별도 작업)로 분리 — 본 메서드에서는 unsupported 처리.
  async setShippingInfo(params: {
    userId: string;
    items: Array<{
      orderId: string;
      shippingCorp: string;
      trackingNo: string;
    }>;
  }): Promise<{
    totalRequested: number;
    totalSent: number;
    totalFailed: number;
    skipped: number;
    results: Array<{
      orderId: string;
      channelOrderId: string;
      ok: boolean;
      message?: string;
    }>;
  }> {
    const db: DbLike = this.app.db;
    if (params.items.length === 0) {
      return {
        totalRequested: 0,
        totalSent: 0,
        totalFailed: 0,
        skipped: 0,
        results: [],
      };
    }

    const orderIds = params.items.map((i) => i.orderId);
    const inputByOrderId = new Map(params.items.map((i) => [i.orderId, i]));

    const rows = await db
      .select({
        id: orders.id,
        channelId: orders.channelId,
        channelOrderId: orders.channelOrderId,
        fulfillmentStatus: orders.fulfillmentStatus,
        channelType: channels.channelType,
      })
      .from(orders)
      .innerJoin(channels, eq(channels.id, orders.channelId))
      .where(
        and(eq(orders.userId, params.userId), inArray(orders.id, orderIds)),
      );

    // 운송장 등록 가능 rank: 30(출고대기) / 35(출고보류) / 40(운송장출력)
    const ELIGIBLE_RANKS: ReadonlySet<number> = new Set([30, 35, 40]);
    const eligible = rows.filter((r) => ELIGIBLE_RANKS.has(r.fulfillmentStatus));
    const skipped = rows.length - eligible.length;

    const byChannel = new Map<string, typeof eligible>();
    for (const r of eligible) {
      const list = byChannel.get(r.channelId) ?? [];
      list.push(r);
      byChannel.set(r.channelId, list);
    }

    const allResults: Array<{
      orderId: string;
      channelOrderId: string;
      ok: boolean;
      message?: string;
    }> = [];

    for (const [channelId, group] of byChannel) {
      const channelKey = this.channelTypeToKey(group[0]?.channelType);
      if (!channelKey) {
        for (const r of group) {
          allResults.push({
            orderId: r.id,
            channelOrderId: r.channelOrderId,
            ok: false,
            message: "unsupported_channel",
          });
        }
        continue;
      }

      // Shopify는 FulfillmentOrder 기반 fulfillmentCreate를 주문별로 순차 호출.
      // Bulk primitive가 없음 — pushTracking을 per-order로 적용.
      if (channelKey === "shopify") {
        const adapter = await this.buildAdapter(params.userId, channelId, channelKey);
        if (!adapter || !adapter.pushTracking) {
          for (const r of group) {
            allResults.push({
              orderId: r.id,
              channelOrderId: r.channelOrderId,
              ok: false,
              message: "adapter_unavailable",
            });
          }
          continue;
        }

        for (const r of group) {
          const input = inputByOrderId.get(r.id);
          if (!input) {
            allResults.push({
              orderId: r.id,
              channelOrderId: r.channelOrderId,
              ok: false,
              message: "missing_input",
            });
            continue;
          }
          try {
            const pr = await adapter.pushTracking({
              channelOrderId: r.channelOrderId,
              trackingCarrier: input.shippingCorp,
              trackingNo: input.trackingNo,
            });
            const ok = pr?.ok === true;
            if (ok) {
              await this.transitionToShipped(
                r.id,
                channelId,
                r.fulfillmentStatus,
                input.shippingCorp,
                input.trackingNo,
                "shopify_fulfillment_create",
              );
            }
            allResults.push({
              orderId: r.id,
              channelOrderId: r.channelOrderId,
              ok,
              message: pr?.message ?? (ok ? undefined : "no_result"),
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            allResults.push({
              orderId: r.id,
              channelOrderId: r.channelOrderId,
              ok: false,
              message,
            });
            await this.logEvent(db, {
              userId: params.userId,
              channelId,
              orderId: r.id,
              orderItemId: null,
              eventType: "collect_error",
              result: "error",
              message: `Shopify fulfillmentCreate 실패: ${message}`,
              detail: {
                channelKey,
                phase: "shipping_shopify",
                channelOrderId: r.channelOrderId,
              },
            });
          }
        }
        continue;
      }

      const adapter = await this.buildAdapter(params.userId, channelId, channelKey);
      if (!adapter || !adapter.pushTrackingBulk) {
        for (const r of group) {
          allResults.push({
            orderId: r.id,
            channelOrderId: r.channelOrderId,
            ok: false,
            message: "adapter_unavailable",
          });
        }
        continue;
      }

      const CHUNK = 500;
      for (let i = 0; i < group.length; i += CHUNK) {
        const chunk = group.slice(i, i + CHUNK);
        const items = chunk
          .map((r) => {
            const input = inputByOrderId.get(r.id);
            if (!input) return null;
            return {
              channelOrderId: r.channelOrderId,
              trackingCarrier: input.shippingCorp,
              trackingNo: input.trackingNo,
            };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null);

        try {
          const pushResults = await adapter.pushTrackingBulk({ items });
          const byCoid = new Map(pushResults.map((p) => [p.channelOrderId, p]));
          for (const r of chunk) {
            const pr = byCoid.get(r.channelOrderId);
            const input = inputByOrderId.get(r.id);
            const ok = pr?.ok === true;
            if (ok && input) {
              await this.transitionToShipped(
                r.id,
                channelId,
                r.fulfillmentStatus,
                input.shippingCorp,
                input.trackingNo,
                "qoo10_set_sending_info_bulk",
              );
            }
            allResults.push({
              orderId: r.id,
              channelOrderId: r.channelOrderId,
              ok,
              message: pr?.message ?? (ok ? undefined : "no_result"),
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          for (const r of chunk) {
            allResults.push({
              orderId: r.id,
              channelOrderId: r.channelOrderId,
              ok: false,
              message,
            });
          }
          await this.logEvent(db, {
            userId: params.userId,
            channelId,
            orderId: null,
            orderItemId: null,
            eventType: "collect_error",
            result: "error",
            message: `setShippingInfo 실패: ${message}`,
            detail: {
              channelKey,
              phase: "shipping_bulk",
              count: chunk.length,
            },
          });
        }
      }
    }

    const totalSent = allResults.filter((r) => r.ok).length;
    const totalFailed = allResults.filter((r) => !r.ok).length;
    return {
      totalRequested: params.items.length,
      totalSent,
      totalFailed,
      skipped,
      results: allResults,
    };
  }

  private async transitionToShipped(
    orderId: string,
    channelId: string,
    fromRank: number,
    trackingCarrier: string,
    trackingNo: string,
    reason: string,
  ): Promise<void> {
    const db: DbLike = this.app.db;
    const now = new Date();
    await db.transaction(async (tx) => {
      const txDb = tx as unknown as DbLike;
      await txDb
        .update(orders)
        .set({
          fulfillmentStatus: 50,
          trackingCarrier,
          trackingNo,
          shippedAt: now,
          updatedAt: now,
        })
        .where(eq(orders.id, orderId));
      await txDb.insert(orderStatusHistory).values({
        orderId,
        fromFulfillment: fromRank as 30 | 35 | 40,
        toFulfillment: 50,
        actor: "user",
        actorId: channelId,
        reason,
      });
    });
  }

  async quickCollect(
    params: QuickCollectParams,
  ): Promise<{ collect: CollectResult; sync: SyncResult }> {
    const settings = await this.loadUserOrderSettings(params.userId);
    const channelIds =
      params.channelIds ?? (await this.loadAllChannelIds(params.userId));
    const sinceDate = computeSinceDate(settings.lookbackDays);

    const collect = await this.collectOrders({
      userId: params.userId,
      channelIds,
      sinceDate,
    });
    const sync = await this.syncOrders({
      userId: params.userId,
      channelIds,
      sinceDate,
    });

    return { collect, sync };
  }

  // ── dispatch: 20 → 30 출고지시 (내부 전환만) ──────────────────
  async dispatchOrders(params: {
    userId: string;
    orderIds: string[];
    reason?: string;
  }): Promise<{
    totalRequested: number;
    totalDispatched: number;
    skipped: number;
    results: Array<{ orderId: string; ok: boolean; message?: string }>;
  }> {
    const db: DbLike = this.app.db;
    if (params.orderIds.length === 0) {
      return { totalRequested: 0, totalDispatched: 0, skipped: 0, results: [] };
    }
    const rows = await db
      .select({
        id: orders.id,
        channelId: orders.channelId,
        fulfillmentStatus: orders.fulfillmentStatus,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, params.userId),
          inArray(orders.id, params.orderIds),
        ),
      );

    const eligible = rows.filter((r) => r.fulfillmentStatus === 20);
    const skipped = rows.length - eligible.length;
    const reason = params.reason ?? "user_dispatch_action";

    const giftService = new GiftRuleService(this.app, params.userId);

    const results: Array<{ orderId: string; ok: boolean; message?: string }> = [];
    for (const r of eligible) {
      try {
        await db.transaction(async (tx) => {
          const txDb = tx as unknown as DbLike;
          await txDb
            .update(orders)
            .set({ fulfillmentStatus: 30, updatedAt: new Date() })
            .where(eq(orders.id, r.id));
          await txDb.insert(orderStatusHistory).values({
            orderId: r.id,
            fromFulfillment: 20,
            toFulfillment: 30,
            actor: "user",
            actorId: r.channelId,
            reason,
          });
          const gifts = await giftService.evaluateForOrder(r.id, "auto", txDb);
          if (gifts.length > 0) {
            await giftService.applyToOrder(r.id, gifts, txDb);
          }
        });
        results.push({ orderId: r.id, ok: true });
      } catch (err) {
        results.push({
          orderId: r.id,
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    for (const r of rows) {
      if (r.fulfillmentStatus !== 20) {
        results.push({
          orderId: r.id,
          ok: false,
          message: `not_eligible_rank_${r.fulfillmentStatus}`,
        });
      }
    }
    const totalDispatched = results.filter((r) => r.ok).length;
    return {
      totalRequested: params.orderIds.length,
      totalDispatched,
      skipped,
      results,
    };
  }

  // ── copy: line items + 수령인 복제, 새 row는 fulfillment=20 신규 ──
  async copyOrder(params: {
    userId: string;
    orderId: string;
  }): Promise<{ orderId: string }> {
    const db: DbLike = this.app.db;
    const srcRows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, params.userId), eq(orders.id, params.orderId)))
      .limit(1);
    const src = srcRows[0];
    if (!src) throw new Error("order_not_found");

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, params.orderId));

    const newChannelOrderId = `COPY-${src.channelOrderId}-${Date.now()}`;
    const now = new Date();
    return await db.transaction(async (tx) => {
      const txDb = tx as unknown as DbLike;
      const insertedRows = await txDb
        .insert(orders)
        .values({
          userId: src.userId,
          channelId: src.channelId,
          channelOrderId: newChannelOrderId,
          channelAccountId: src.channelAccountId,
          // 수령인 11필드
          receiverName: src.receiverName,
          receiverKana: src.receiverKana,
          receiverTel: src.receiverTel,
          receiverMobile: src.receiverMobile,
          receiverEmail: src.receiverEmail,
          zipCode: src.zipCode,
          shippingAddress: src.shippingAddress,
          address1: src.address1,
          address2: src.address2,
          receiverCountry: src.receiverCountry,
          desiredDeliveryDate: src.desiredDeliveryDate,
          // 결제 최소
          orderedAt: now,
          currency: src.currency,
          // 신규 상태
          fulfillmentStatus: 20,
          autoMatched: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: orders.id });
      const newOrderId = insertedRows[0]?.id;
      if (!newOrderId) throw new Error("copy_insert_failed");

      if (items.length > 0) {
        await txDb.insert(orderItems).values(
          items.map((it) => ({
            orderId: newOrderId,
            lineNo: it.lineNo,
            channelItemCode: it.channelItemCode,
            channelItemTitle: it.channelItemTitle,
            channelOption: it.channelOption,
            channelOptionCode: it.channelOptionCode,
            orderQty: it.orderQty,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
            skuId: it.skuId,
            skuCode: it.skuCode,
            skuName: it.skuName,
            outputQty: it.outputQty,
          })),
        );
      }

      await txDb.insert(orderStatusHistory).values({
        orderId: newOrderId,
        fromFulfillment: null,
        toFulfillment: 20,
        actor: "user",
        actorId: src.channelId,
        reason: `copied_from:${params.orderId}`,
      });

      return { orderId: newOrderId };
    });
  }

  // ── delete: hard delete (우리 DB만, 채널엔 영향 없음) ──────────
  async deleteOrders(params: {
    userId: string;
    orderIds: string[];
  }): Promise<{
    totalRequested: number;
    totalDeleted: number;
    skipped: number;
    results: Array<{ orderId: string; ok: boolean; message?: string }>;
  }> {
    const db: DbLike = this.app.db;
    if (params.orderIds.length === 0) {
      return { totalRequested: 0, totalDeleted: 0, skipped: 0, results: [] };
    }
    const rows = await db
      .select({ id: orders.id, fulfillmentStatus: orders.fulfillmentStatus })
      .from(orders)
      .where(
        and(
          eq(orders.userId, params.userId),
          inArray(orders.id, params.orderIds),
        ),
      );

    const results: Array<{ orderId: string; ok: boolean; message?: string }> = [];
    const toDelete: string[] = [];
    for (const r of rows) {
      // 90(판매완료) 불가침
      if (r.fulfillmentStatus === 90) {
        results.push({ orderId: r.id, ok: false, message: "rank_90_locked" });
        continue;
      }
      toDelete.push(r.id);
    }
    if (toDelete.length > 0) {
      // orderItems / orderStatusHistory 는 CASCADE 로 정리
      await db.delete(orders).where(inArray(orders.id, toDelete));
      for (const id of toDelete) {
        results.push({ orderId: id, ok: true });
      }
    }
    const skipped = rows.length - toDelete.length;
    return {
      totalRequested: params.orderIds.length,
      totalDeleted: toDelete.length,
      skipped,
      results,
    };
  }

  // ── split: line items 을 자식 주문으로 분리, relatedOrders 누적 ──
  async splitOrder(params: {
    userId: string;
    orderId: string;
    splits: Array<{ itemIds: string[] }>; // 각 split = 자식 주문 하나
  }): Promise<{ parentOrderId: string; childOrderIds: string[] }> {
    const db: DbLike = this.app.db;
    if (params.splits.length === 0) throw new Error("splits_required");

    const srcRows = await db
      .select()
      .from(orders)
      .where(
        and(eq(orders.userId, params.userId), eq(orders.id, params.orderId)),
      )
      .limit(1);
    const src = srcRows[0];
    if (!src) throw new Error("order_not_found");

    const allItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, params.orderId));
    const itemById = new Map(allItems.map((it) => [it.id, it]));

    // 모든 분할 itemIds 가 본 주문에 속하는지 검증
    const usedIds = new Set<string>();
    for (const sp of params.splits) {
      for (const iid of sp.itemIds) {
        if (!itemById.has(iid)) throw new Error(`item_not_found:${iid}`);
        if (usedIds.has(iid)) throw new Error(`item_duplicated:${iid}`);
        usedIds.add(iid);
      }
    }

    const now = new Date();
    return await db.transaction(async (tx) => {
      const txDb = tx as unknown as DbLike;
      const childIds: string[] = [];
      for (let i = 0; i < params.splits.length; i++) {
        const sp = params.splits[i];
        const childCoid = `${src.channelOrderId}-SP${i + 1}-${Date.now()}`;
        const insertedRows = await txDb
          .insert(orders)
          .values({
            userId: src.userId,
            channelId: src.channelId,
            channelOrderId: childCoid,
            channelAccountId: src.channelAccountId,
            receiverName: src.receiverName,
            receiverKana: src.receiverKana,
            receiverTel: src.receiverTel,
            receiverMobile: src.receiverMobile,
            receiverEmail: src.receiverEmail,
            zipCode: src.zipCode,
            shippingAddress: src.shippingAddress,
            address1: src.address1,
            address2: src.address2,
            receiverCountry: src.receiverCountry,
            orderedAt: src.orderedAt,
            currency: src.currency,
            fulfillmentStatus: src.fulfillmentStatus,
            autoMatched: false,
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: orders.id });
        const childId = insertedRows[0]?.id;
        if (!childId) throw new Error("split_insert_failed");
        childIds.push(childId);

        // line items 이동: parent → child
        for (const iid of sp.itemIds) {
          await txDb
            .update(orderItems)
            .set({ orderId: childId })
            .where(eq(orderItems.id, iid));
        }
        await txDb.insert(orderStatusHistory).values({
          orderId: childId,
          fromFulfillment: null,
          toFulfillment: src.fulfillmentStatus as 20,
          actor: "user",
          actorId: src.channelId,
          reason: `split_from:${params.orderId}`,
        });
      }

      // 부모 relatedOrders 갱신
      const prev = Array.isArray(src.relatedOrders)
        ? (src.relatedOrders as string[])
        : [];
      await txDb
        .update(orders)
        .set({
          relatedOrders: [...prev, ...childIds],
          updatedAt: now,
        })
        .where(eq(orders.id, params.orderId));

      return { parentOrderId: params.orderId, childOrderIds: childIds };
    });
  }

  // ── bundle: bundleNumber 공유로 합포장 ─────────────────────────
  async bundleOrders(params: {
    userId: string;
    orderIds: string[];
    primaryOrderId?: string; // 미지정 시 첫번째
  }): Promise<{ bundleNumber: string; orderIds: string[] }> {
    const db: DbLike = this.app.db;
    if (params.orderIds.length < 2) throw new Error("at_least_two_orders_required");

    const rows = await db
      .select({
        id: orders.id,
        receiverName: orders.receiverName,
        zipCode: orders.zipCode,
        shippingAddress: orders.shippingAddress,
        bundleable: orders.bundleable,
        bundleNumber: orders.bundleNumber,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, params.userId),
          inArray(orders.id, params.orderIds),
        ),
      );

    if (rows.length !== params.orderIds.length) {
      throw new Error("some_orders_not_found");
    }
    for (const r of rows) {
      if (!r.bundleable) throw new Error(`not_bundleable:${r.id}`);
      if (r.bundleNumber) throw new Error(`already_bundled:${r.id}`);
    }
    // 동일 수령인/우편번호 검증
    const first = rows[0];
    for (const r of rows.slice(1)) {
      if (
        r.receiverName !== first.receiverName ||
        r.zipCode !== first.zipCode
      ) {
        throw new Error("receiver_mismatch");
      }
    }

    const bundleNumber = `BD-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const primaryId = params.primaryOrderId ?? rows[0].id;
    const now = new Date();

    await db.transaction(async (tx) => {
      const txDb = tx as unknown as DbLike;
      await txDb
        .update(orders)
        .set({ bundleNumber, bundleRoleIsPrimary: false, updatedAt: now })
        .where(inArray(orders.id, params.orderIds));
      await txDb
        .update(orders)
        .set({ bundleRoleIsPrimary: true, updatedAt: now })
        .where(eq(orders.id, primaryId));
    });

    return { bundleNumber, orderIds: params.orderIds };
  }

  // ── internal ──────────────────────────────────────────────────

  private async loadUserOrderSettings(userId: string): Promise<UserOrderSettings> {
    const db: DbLike = this.app.db;
    const rows = await db
      .select({ orders: userSettings.orders })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    const saved = rows[0]?.orders as Partial<UserOrderSettings> | undefined;
    return {
      ...DEFAULT_USER_ORDER_SETTINGS,
      ...(saved ?? {}),
    } as UserOrderSettings;
  }

  private async loadChannels(userId: string, channelIds: string[]) {
    if (channelIds.length === 0) return [];
    const db: DbLike = this.app.db;
    return await db
      .select({
        id: channels.id,
        channelType: channels.channelType,
      })
      .from(channels)
      .where(and(eq(channels.userId, userId), inArray(channels.id, channelIds)));
  }

  private async loadAllChannelIds(userId: string): Promise<string[]> {
    const db: DbLike = this.app.db;
    const rows = await db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.userId, userId));
    return rows.map((r) => r.id);
  }

  private channelTypeToKey(
    channelType: string | null | undefined,
  ): ChannelKey | null {
    switch (channelType) {
      case "QOO10_JP":
        return "qoo10";
      case "SHOPIFY":
        return "shopify";
      case "SHOPEE":
        return "shopee";
      case "RAKUTEN":
        return "rakuten";
      default:
        return null;
    }
  }

  private async buildAdapter(
    userId: string,
    _channelId: string,
    channelKey: ChannelKey,
  ): Promise<IOrderAdapter | null> {
    const channelService = new ChannelService(this.app, userId);
    if (channelKey === "qoo10") {
      const cred = await channelService.getQoo10Credential();
      if (!cred) return null;
      return new QOO10OrderAdapter(cred.channelId, cred.certificationKey);
    }
    if (channelKey === "shopify") {
      const cred = await channelService.getShopifyCredential();
      if (!cred) return null;
      return new ShopifyOrderAdapter(
        cred.channelId,
        cred.shopDomain,
        cred.accessToken,
      );
    }
    return null;
  }

  // ── upsert (collect) ──────────────────────────────────────────

  private async upsertOrder(
    userId: string,
    channelId: string,
    std: StandardOrder,
    settings: UserOrderSettings,
  ): Promise<"inserted" | "updated" | "skipped"> {
    const db: DbLike = this.app.db;
    return await db.transaction(async (tx) => {
      const txDb = tx as unknown as DbLike;
      const existing = await txDb
        .select({
          id: orders.id,
          fulfillmentStatus: orders.fulfillmentStatus,
          syncLocked: orders.syncLocked,
        })
        .from(orders)
        .where(
          and(
            eq(orders.channelId, channelId),
            eq(orders.channelOrderId, std.channelOrderId),
          ),
        )
        .limit(1);

      const bundleNumber = computeBundleNumber(std, settings.bundleKey);
      const duplicateGroupKey = computeDuplicateKey(std);

      if (existing.length === 0) {
        const inserted = await txDb
          .insert(orders)
          .values({
            userId,
            channelId,
            channelOrderId: std.channelOrderId,
            channelPackNo: std.channelPackNo,
            channelItemNo: std.channelItemNo,
            channelAccountId: std.channelAccountId,
            relatedOrders: std.relatedOrders ?? [],
            buyerName: std.buyerName,
            buyerKana: std.buyerKana,
            buyerTel: std.buyerTel,
            buyerMobile: std.buyerMobile,
            buyerEmail: std.buyerEmail,
            buyerLanguage: std.buyerLanguage,
            receiverName: std.receiverName,
            receiverKana: std.receiverKana,
            receiverTel: std.receiverTel,
            receiverMobile: std.receiverMobile,
            receiverEmail: std.receiverEmail,
            zipCode: std.zipCode,
            shippingAddress: std.shippingAddress,
            address1: std.address1,
            address2: std.address2,
            receiverCountry: std.receiverCountry,
            desiredDeliveryDate: std.desiredDeliveryDate
              ? new Date(std.desiredDeliveryDate)
              : null,
            senderName: std.senderName,
            senderTel: std.senderTel,
            senderNation: std.senderNation,
            senderZipCode: std.senderZipCode,
            senderAddress: std.senderAddress,
            orderedAt: new Date(std.orderedAt),
            paidAt: std.paidAt ? new Date(std.paidAt) : null,
            paymentMethod: std.paymentMethod,
            currency: std.currency,
            orderPrice: numStr(std.orderPrice),
            discount: numStr(std.discount),
            cartDiscountSeller: numStr(std.cartDiscountSeller),
            cartDiscountChannel: numStr(std.cartDiscountChannel),
            total: numStr(std.total),
            shippingWay: std.shippingWay,
            shippingMessage: std.shippingMessage,
            shippingRate: numStr(std.shippingRate),
            shippingRateType: std.shippingRateType,
            shippingDueDate: std.shippingDueDate
              ? new Date(std.shippingDueDate)
              : null,
            shippedAt: std.shippedAt ? new Date(std.shippedAt) : null,
            deliveredAt: std.deliveredAt ? new Date(std.deliveredAt) : null,
            trackingCarrier: std.trackingCarrier,
            trackingNo: std.trackingNo,
            trackingConflict: std.trackingConflict ?? false,
            trackingConflictPayload: std.trackingConflictPayload ?? null,
            fulfillmentStatus: std.fulfillmentStatus,
            claimStatus: std.claimStatus,
            displayStatus: std.displayStatus,
            isDispatchDelayed: computeDispatchDelayed(
              std,
              settings.dispatchDelayThresholdDays,
            ),
            claimType: std.claimType,
            claimReason: std.claimReason,
            claimRequestedAt: std.claimRequestedAt
              ? new Date(std.claimRequestedAt)
              : null,
            claimResolvedAt: std.claimResolvedAt
              ? new Date(std.claimResolvedAt)
              : null,
            returnTrackingNo: std.returnTrackingNo,
            bundleNumber,
            bundleable: std.bundleable ?? true,
            bundleRoleIsPrimary: std.bundleRoleIsPrimary ?? false,
            duplicateGroupKey,
            autoMatched: false,
            matchedBy: null,
            rawData: std.rawData ?? null,
          })
          .returning({ id: orders.id });

        const orderId = inserted[0]?.id;
        if (orderId) {
          await this.insertLineItems(
            txDb,
            userId,
            channelId,
            orderId,
            std.lineItems,
            settings,
          );
          await txDb.insert(orderStatusHistory).values({
            orderId,
            fromFulfillment: null,
            toFulfillment: std.fulfillmentStatus,
            actor: "channel",
            actorId: channelId,
            reason: "initial_collect",
          });
        }
        return "inserted";
      }

      const existingRow = existing[0]!;
      const currentRank = existingRow.fulfillmentStatus as FulfillmentRank;
      const guard = StatusRuleEngine.applyRankGuard(
        currentRank,
        std.fulfillmentStatus,
        "sync",
      );

      const toUpdate: Record<string, unknown> = {
        channelPackNo: std.channelPackNo,
        channelItemNo: std.channelItemNo,
        receiverName: std.receiverName,
        receiverTel: std.receiverTel,
        receiverMobile: std.receiverMobile,
        zipCode: std.zipCode,
        shippingAddress: std.shippingAddress,
        address1: std.address1,
        address2: std.address2,
        displayStatus: std.displayStatus,
        duplicateGroupKey,
        rawData: std.rawData ?? null,
        updatedAt: new Date(),
      };

      if (!guard.ignored && guard.next !== currentRank) {
        toUpdate.fulfillmentStatus = guard.next;
        if (std.shippedAt) toUpdate.shippedAt = new Date(std.shippedAt);
        if (std.deliveredAt) toUpdate.deliveredAt = new Date(std.deliveredAt);
        if (std.trackingNo && !existingRow.syncLocked) {
          toUpdate.trackingNo = std.trackingNo;
          toUpdate.trackingCarrier = std.trackingCarrier;
        }
      }

      await txDb.update(orders).set(toUpdate).where(eq(orders.id, existingRow.id));

      if (!guard.ignored && guard.next !== currentRank) {
        await txDb.insert(orderStatusHistory).values({
          orderId: existingRow.id,
          fromFulfillment: currentRank,
          toFulfillment: guard.next,
          actor: "channel",
          actorId: channelId,
          reason: "collect_status_advance",
        });
      }
      return "updated";
    });
  }

  private async insertLineItems(
    txDb: DbLike,
    userId: string,
    channelId: string,
    orderId: string,
    lines: StandardOrderItem[],
    settings: UserOrderSettings,
  ): Promise<void> {
    if (!lines || lines.length === 0) return;

    const ruleSvc = new MatchingRuleService(this.app, userId);

    for (const line of lines) {
      const ifKey = {
        channelId,
        channelItemCode: line.channelItemCode ?? '',
        channelItemTitle: line.channelItemTitle ?? null,
        optionCode: line.channelOptionCode ?? null,
        optionName: line.channelOption ?? null,
      };

      // 1) 규칙 우선 평가 — channelItemCode 가 비어있으면 키가 성립하지 않으므로 스킵
      const ruleHit = ifKey.channelItemCode
        ? await ruleSvc.resolve(ifKey, txDb)
        : null;

      let matchedBy: 'auto' | 'manual' | 'rule' | null = null;
      let matchRuleId: string | null = null;
      let resolvedSkuId: string | null = null;
      let resolvedSkuCode: string | null = null;
      let resolvedSkuName: string | null = null;
      let resolvedOutputQty: number = line.outputQty ?? 0;
      let resolvedWarehouseId: string | null = line.warehouseId ?? null;
      let autoMatched: Awaited<ReturnType<typeof this.autoMatchSku>> = {
        skuId: null,
        skuCode: null,
        skuName: null,
        candidates: [],
        matches: [],
      };

      if (ruleHit) {
        matchedBy = 'rule';
        matchRuleId = ruleHit.ruleId;
        resolvedSkuId = ruleHit.skuId;
        resolvedSkuCode = ruleHit.skuCode;
        resolvedSkuName = ruleHit.skuName;
        resolvedOutputQty = ruleHit.outputQty;
        if (ruleHit.warehouseId) resolvedWarehouseId = ruleHit.warehouseId;
      } else if (settings.autoMatchSku) {
        // 2) 규칙 미적중 → SKU 직매칭
        autoMatched = await this.autoMatchSku(txDb, userId, line);
        if (autoMatched.skuId) {
          matchedBy = 'auto';
          resolvedSkuId = autoMatched.skuId;
          resolvedSkuCode = autoMatched.skuCode;
          resolvedSkuName = autoMatched.skuName;
        }
      }

      const inserted = await txDb
        .insert(orderItems)
        .values({
          orderId,
          lineNo: line.lineNo,
          channelItemCode: line.channelItemCode,
          channelItemTitle: line.channelItemTitle,
          channelOption: line.channelOption,
          channelOptionCode: line.channelOptionCode,
          orderQty: line.orderQty,
          unitPrice: numStr(line.unitPrice),
          totalPrice: numStr(line.totalPrice),
          skuId: resolvedSkuId,
          skuCode: resolvedSkuCode,
          skuName: resolvedSkuName,
          outputQty: resolvedOutputQty,
          appliedGifts: line.appliedGifts ?? [],
          warehouseId: resolvedWarehouseId,
          matchedBy,
          matchRuleId,
        })
        .returning({ id: orderItems.id });
      const orderItemId = inserted[0]?.id ?? null;

      if (ruleHit) {
        // 규칙 적중 — hit 카운터 증가 + 이벤트 로그
        ruleSvc.recordHit(ruleHit.ruleId, txDb).catch((err) => {
          this.app.log.warn(
            { err, ruleId: ruleHit.ruleId },
            'match_rules recordHit failed',
          );
        });
        await this.logEvent(txDb, {
          userId,
          channelId,
          orderId,
          orderItemId,
          eventType: 'auto_match_success',
          result: 'ok',
          message: `규칙 매칭 성공: ${ruleHit.skuCode}`,
          detail: {
            via: 'rule',
            ruleId: ruleHit.ruleId,
            skuCode: ruleHit.skuCode,
            skuName: ruleHit.skuName,
            channelItemCode: line.channelItemCode,
            channelOptionCode: line.channelOptionCode,
          },
        });
      } else if (settings.autoMatchSku) {
        if (autoMatched.matches.length > 1) {
          await this.logEvent(txDb, {
            userId,
            channelId,
            orderId,
            orderItemId,
            eventType: 'duplicate_suspect',
            result: 'warn',
            message: `SKU 후보 ${autoMatched.matches.length}건 발견 — 첫 번째(${autoMatched.skuCode})를 사용`,
            detail: {
              candidates: autoMatched.candidates,
              matches: autoMatched.matches.map((m) => ({ code: m.code, name: m.name })),
              chosen: autoMatched.skuCode,
              channelItemCode: line.channelItemCode,
              channelOptionCode: line.channelOptionCode,
            },
          });
        } else if (autoMatched.skuId) {
          await this.logEvent(txDb, {
            userId,
            channelId,
            orderId,
            orderItemId,
            eventType: 'auto_match_success',
            result: 'ok',
            message: `SKU 매칭 성공: ${autoMatched.skuCode}`,
            detail: {
              via: 'auto',
              skuCode: autoMatched.skuCode,
              skuName: autoMatched.skuName,
              channelItemCode: line.channelItemCode,
              channelOptionCode: line.channelOptionCode,
            },
          });
          // 자동학습 — IF 키가 성립하는 경우에만 (channelItemCode 필수)
          if (ifKey.channelItemCode) {
            try {
              const learned = await ruleSvc.autoLearn(ifKey, autoMatched.skuId, {
                outputQty: line.outputQty ?? 1,
                warehouseId: line.warehouseId ?? null,
                txDb,
              });
              if (learned.created && learned.id) {
                await this.logEvent(txDb, {
                  userId,
                  channelId,
                  orderId,
                  orderItemId,
                  eventType: 'rule_auto_learned',
                  result: 'ok',
                  message: `매칭규칙 자동저장: ${autoMatched.skuCode}`,
                  detail: {
                    ruleId: learned.id,
                    skuCode: autoMatched.skuCode,
                    channelItemCode: line.channelItemCode,
                    channelItemTitle: line.channelItemTitle,
                    optionCode: line.channelOptionCode,
                    optionName: line.channelOption,
                  },
                });
              }
            } catch (err) {
              this.app.log.warn(
                { err, userId, channelId, channelItemCode: line.channelItemCode },
                'match_rules autoLearn failed',
              );
            }
          }
        } else {
          await this.logEvent(txDb, {
            userId,
            channelId,
            orderId,
            orderItemId,
            eventType: 'auto_match_failed',
            result: 'warn',
            message:
              autoMatched.candidates.length === 0
                ? '매칭할 코드가 비어있음'
                : `SKU 미발견: ${autoMatched.candidates.join(', ')}`,
            detail: {
              candidates: autoMatched.candidates,
              channelItemCode: line.channelItemCode,
              channelOptionCode: line.channelOptionCode,
              channelItemTitle: line.channelItemTitle,
              channelOption: line.channelOption,
            },
          });
        }
      }
    }
  }

  private async logEvent(
    txDb: DbLike,
    params: {
      userId: string;
      channelId: string | null;
      orderId: string | null;
      orderItemId: string | null;
      eventType:
        | "auto_match_success"
        | "auto_match_failed"
        | "duplicate_suspect"
        | "rule_auto_learned"
        | "status_sync"
        | "collect_error";
      result: "ok" | "warn" | "error";
      message?: string | null;
      detail?: unknown;
    },
  ): Promise<void> {
    try {
      await txDb.insert(orderEventLog).values({
        userId: params.userId,
        channelId: params.channelId,
        orderId: params.orderId,
        orderItemId: params.orderItemId,
        eventType: params.eventType,
        result: params.result,
        message: params.message ?? null,
        detail: (params.detail ?? null) as Record<string, unknown> | null,
      });
    } catch (err) {
      this.app.log.warn(
        { err, eventType: params.eventType, userId: params.userId },
        "order_event_log insert failed",
      );
    }
  }

  private async autoMatchSku(
    txDb: DbLike,
    userId: string,
    line: StandardOrderItem,
  ): Promise<{
    skuId: string | null;
    skuCode: string | null;
    skuName: string | null;
    candidates: string[];
    matches: Array<{ id: string; code: string; name: string | null }>;
  }> {
    const candidates = [line.channelOptionCode, line.channelItemCode].filter(
      (v): v is string => !!v && v.trim().length > 0,
    );
    if (candidates.length === 0) {
      return {
        skuId: null,
        skuCode: null,
        skuName: null,
        candidates,
        matches: [],
      };
    }
    const found = await txDb
      .select({ id: skus.id, code: skus.code, name: skus.name })
      .from(skus)
      .where(and(eq(skus.userId, userId), inArray(skus.code, candidates)));
    const matches = found.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name ?? null,
    }));
    const hit = matches[0];
    if (!hit) {
      return { skuId: null, skuCode: null, skuName: null, candidates, matches };
    }
    return {
      skuId: hit.id,
      skuCode: hit.code,
      skuName: hit.name,
      candidates,
      matches,
    };
  }

  // ── sync (status update only) ─────────────────────────────────

  private async syncOne(
    userId: string,
    channelId: string,
    std: StandardOrder,
    channelKey: ChannelKey,
  ): Promise<boolean> {
    const db: DbLike = this.app.db;
    return await db.transaction(async (tx) => {
      const txDb = tx as unknown as DbLike;
      const existing = await txDb
        .select({
          id: orders.id,
          fulfillmentStatus: orders.fulfillmentStatus,
          syncLocked: orders.syncLocked,
          trackingNo: orders.trackingNo,
        })
        .from(orders)
        .where(
          and(
            eq(orders.channelId, channelId),
            eq(orders.channelOrderId, std.channelOrderId),
          ),
        )
        .limit(1);
      if (existing.length === 0) return false;
      const row = existing[0]!;
      if (row.syncLocked) return false;

      const currentRank = row.fulfillmentStatus as FulfillmentRank;
      const candidate = candidateRank(channelKey, std);
      const guard = StatusRuleEngine.applyRankGuard(currentRank, candidate, "sync");

      if (guard.ignored || guard.next === currentRank) {
        const trackingChanged =
          !!std.trackingNo && std.trackingNo !== row.trackingNo;
        if (!trackingChanged) return false;
        await txDb
          .update(orders)
          .set({
            trackingNo: std.trackingNo,
            trackingCarrier: std.trackingCarrier,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, row.id));
        return true;
      }

      await txDb
        .update(orders)
        .set({
          fulfillmentStatus: guard.next,
          shippedAt: std.shippedAt ? new Date(std.shippedAt) : undefined,
          deliveredAt: std.deliveredAt ? new Date(std.deliveredAt) : undefined,
          trackingNo: std.trackingNo ?? undefined,
          trackingCarrier: std.trackingCarrier ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, row.id));

      await txDb.insert(orderStatusHistory).values({
        orderId: row.id,
        fromFulfillment: currentRank,
        toFulfillment: guard.next,
        actor: "channel",
        actorId: channelId,
        reason: "channel_status_sync",
      });
      await this.logEvent(txDb, {
        userId,
        channelId,
        orderId: row.id,
        orderItemId: null,
        eventType: "status_sync",
        result: "ok",
        message: `상태 ${currentRank} → ${guard.next}`,
        detail: {
          from: currentRank,
          to: guard.next,
          channelKey,
          trackingNo: std.trackingNo ?? null,
          trackingCarrier: std.trackingCarrier ?? null,
        },
      });
      return true;
    });
  }

  // ── barcode dispatch: 스캔한 송장번호/주문번호로 30/35/40 → 50 전환 ──
  async barcodeVerifyAndDispatch(params: {
    userId: string;
    scannedCode: string;
    expectedOrderId?: string;
  }): Promise<{
    matched: boolean;
    reason?:
      | "not_found"
      | "ineligible_status"
      | "expected_mismatch"
      | "multiple_matches";
    order?: {
      id: string;
      channelId: string;
      channelOrderId: string;
      fromFulfillment: number;
      toFulfillment: 50;
      trackingCarrier: string | null;
      trackingNo: string | null;
      buyerName: string | null;
      receiverName: string | null;
    };
  }> {
    const db: DbLike = this.app.db;
    const code = params.scannedCode.trim();
    if (code.length === 0) {
      return { matched: false, reason: "not_found" };
    }

    const rows = await db
      .select({
        id: orders.id,
        channelId: orders.channelId,
        channelOrderId: orders.channelOrderId,
        fulfillmentStatus: orders.fulfillmentStatus,
        trackingCarrier: orders.trackingCarrier,
        trackingNo: orders.trackingNo,
        buyerName: orders.buyerName,
        receiverName: orders.receiverName,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, params.userId),
          sql`(${orders.trackingNo} = ${code} OR ${orders.channelOrderId} = ${code})`,
        ),
      );

    if (rows.length === 0) {
      return { matched: false, reason: "not_found" };
    }
    if (rows.length > 1) {
      return { matched: false, reason: "multiple_matches" };
    }
    const row = rows[0];
    if (params.expectedOrderId && row.id !== params.expectedOrderId) {
      return { matched: false, reason: "expected_mismatch" };
    }

    const ELIGIBLE: ReadonlySet<number> = new Set([30, 35, 40]);
    const fromRank = row.fulfillmentStatus;
    if (!ELIGIBLE.has(fromRank)) {
      return {
        matched: false,
        reason: "ineligible_status",
        order: {
          id: row.id,
          channelId: row.channelId,
          channelOrderId: row.channelOrderId,
          fromFulfillment: fromRank,
          toFulfillment: 50,
          trackingCarrier: row.trackingCarrier,
          trackingNo: row.trackingNo,
          buyerName: row.buyerName,
          receiverName: row.receiverName,
        },
      };
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      const txDb = tx as unknown as DbLike;
      await txDb
        .update(orders)
        .set({ fulfillmentStatus: 50, shippedAt: now, updatedAt: now })
        .where(eq(orders.id, row.id));
      await txDb.insert(orderStatusHistory).values({
        orderId: row.id,
        fromFulfillment: fromRank as 30 | 35 | 40,
        toFulfillment: 50,
        actor: "user",
        actorId: row.channelId,
        reason: "barcode_dispatch",
      });
    });

    return {
      matched: true,
      order: {
        id: row.id,
        channelId: row.channelId,
        channelOrderId: row.channelOrderId,
        fromFulfillment: fromRank,
        toFulfillment: 50,
        trackingCarrier: row.trackingCarrier,
        trackingNo: row.trackingNo,
        buyerName: row.buyerName,
        receiverName: row.receiverName,
      },
    };
  }
}

// ── pure helpers ──────────────────────────────────────────────────

function numStr(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  return String(n);
}

function computeSinceDate(lookbackDays: number): string {
  const ms = lookbackDays * 24 * 60 * 60 * 1000;
  const d = new Date(Date.now() - ms);
  return d.toISOString();
}

function computeBundleNumber(std: StandardOrder, bundleKey: string[]): string | null {
  if (!std.bundleable) return null;
  const parts = bundleKey
    .map((k) => {
      const v = (std as unknown as Record<string, unknown>)[k];
      return v == null ? "" : String(v).trim();
    })
    .filter((v) => v.length > 0);
  if (parts.length < bundleKey.length) return null;
  return parts.join("|");
}

function normalizeForDupeKey(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\-\(\)\[\]\.,/]/g, "");
}

function lastDigits(s: string | null | undefined, count: number): string {
  if (!s) return "";
  const digits = s.replace(/\D/g, "");
  if (digits.length <= count) return digits;
  return digits.slice(-count);
}

function computeDuplicateKey(std: StandardOrder): string | null {
  const name = normalizeForDupeKey(std.receiverName);
  const phoneTail = lastDigits(std.receiverMobile ?? std.receiverTel, 4);
  const zip = (std.zipCode ?? "").replace(/\D/g, "");
  const addrHash = normalizeForDupeKey(
    `${std.address1 ?? std.shippingAddress ?? ""}${std.address2 ?? ""}`,
  ).slice(0, 32);

  const signalCount =
    (name ? 1 : 0) + (phoneTail ? 1 : 0) + (zip || addrHash ? 1 : 0);
  if (signalCount < 2) return null;

  return [name, phoneTail, zip || addrHash].join("|");
}

function computeDispatchDelayed(
  std: StandardOrder,
  thresholdDays: number,
): boolean {
  if (std.fulfillmentStatus >= 50) return false;
  if (!std.shippingDueDate) return false;
  const due = new Date(std.shippingDueDate).getTime();
  if (Number.isNaN(due)) return false;
  return Date.now() - due > thresholdDays * 24 * 60 * 60 * 1000;
}

function candidateRank(channelKey: ChannelKey, std: StandardOrder): FulfillmentRank {
  if (channelKey === "qoo10") {
    return StatusRuleEngine.qoo10.toFulfillment({
      trackingNo: std.trackingNo,
      shippedAt: std.shippedAt,
      deliveredAt: std.deliveredAt,
      estimatedShippingDate: std.shippingDueDate,
    });
  }
  if (channelKey === "shopify") {
    return StatusRuleEngine.shopify.toFulfillment({
      trackingNo: std.trackingNo,
      shippedAt: std.shippedAt,
      deliveredAt: std.deliveredAt,
      displayFulfillmentStatus: std.displayStatus,
    });
  }
  return std.fulfillmentStatus;
}

// suppress unused
void sql;
