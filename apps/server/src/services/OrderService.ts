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

    for (const line of lines) {
      let matched: Awaited<ReturnType<typeof this.autoMatchSku>> = {
        skuId: null,
        skuCode: null,
        skuName: null,
        candidates: [],
        matches: [],
      };
      if (settings.autoMatchSku) {
        matched = await this.autoMatchSku(txDb, userId, line);
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
          skuId: matched.skuId,
          skuCode: matched.skuCode,
          skuName: matched.skuName,
          outputQty: line.outputQty ?? 0,
          appliedGifts: line.appliedGifts ?? [],
          warehouseId: line.warehouseId,
        })
        .returning({ id: orderItems.id });
      const orderItemId = inserted[0]?.id ?? null;

      if (settings.autoMatchSku) {
        if (matched.matches.length > 1) {
          await this.logEvent(txDb, {
            userId,
            channelId,
            orderId,
            orderItemId,
            eventType: "duplicate_suspect",
            result: "warn",
            message: `SKU 후보 ${matched.matches.length}건 발견 — 첫 번째(${matched.skuCode})를 사용`,
            detail: {
              candidates: matched.candidates,
              matches: matched.matches.map((m) => ({ code: m.code, name: m.name })),
              chosen: matched.skuCode,
              channelItemCode: line.channelItemCode,
              channelOptionCode: line.channelOptionCode,
            },
          });
        } else if (matched.skuId) {
          await this.logEvent(txDb, {
            userId,
            channelId,
            orderId,
            orderItemId,
            eventType: "auto_match_success",
            result: "ok",
            message: `SKU 매칭 성공: ${matched.skuCode}`,
            detail: {
              skuCode: matched.skuCode,
              skuName: matched.skuName,
              channelItemCode: line.channelItemCode,
              channelOptionCode: line.channelOptionCode,
            },
          });
        } else {
          await this.logEvent(txDb, {
            userId,
            channelId,
            orderId,
            orderItemId,
            eventType: "auto_match_failed",
            result: "warn",
            message:
              matched.candidates.length === 0
                ? "매칭할 코드가 비어있음"
                : `SKU 미발견: ${matched.candidates.join(", ")}`,
            detail: {
              candidates: matched.candidates,
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
