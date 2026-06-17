/**
 * 50건 주문 시드.
 *
 * 실행:
 *   cd apps/server && bun run db:seed-orders
 *
 * 사전 조건:
 *   - apps/server/.env 의 DATABASE_URL
 *   - 마이그레이션 적용 완료 (0004_aromatic_nekra)
 *
 * 동작:
 *   - QOO10_JP 채널이 없으면 자격증명 없이 PENDING 상태로 1건 INSERT
 *   - orders 50건 + order_items 1~2건/주문 + 일부 order_status_history INSERT
 *   - 재실행 시 channelOrderId 충돌(unique uq_orders_channel_order) → 기존 SEED-* 행 먼저 삭제
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, like } from 'drizzle-orm';
import {
  channels,
  orders,
  orderItems,
  orderStatusHistory,
} from './schema';

type Rank = 10 | 20 | 25 | 30 | 35 | 40 | 50 | 60 | 70 | 80 | 90;

const DAY = 24 * 60 * 60 * 1000;
// 결정론적 시드 — Date.now() 고정 기준.
const BASE = new Date('2026-06-15T09:00:00Z').getTime();
const daysAgo = (n: number) => new Date(BASE - n * DAY);

type OrderSpec = {
  rank: Rank;
  hold?: 'order_hold' | 'dispatch_hold';
  heldFromStatus?: Rank;
  claim?: {
    type: 'cancel' | 'return' | 'exchange' | 'swap';
    status:
      | 'cancel_requested'
      | 'cancel_done'
      | 'return_requested'
      | 'return_in_progress'
      | 'return_collected'
      | 'return_done'
      | 'exchange_requested'
      | 'exchange_in_progress'
      | 'exchange_collected'
      | 'exchange_done'
      | 'swap_requested'
      | 'swap_done'
      | 'requires_recheck';
    reason: string;
  };
  syncLocked?: boolean;
  bundleNumber?: string;
  bundlePrimary?: boolean;
  lines?: number; // 라인 수 (default 1)
};

// 11 rank × 분포 = 50건 (claim/hold는 위에 얹는다)
//  10:8 / 20:6 / 25:3 / 30:8 / 35:3 / 40:4 / 50:6 / 60:5 / 70:3 / 80:2 / 90:2 = 50
const SPECS: OrderSpec[] = [
  // rank 10 결제완료 (8)
  ...repeat(8, (i) => ({ rank: 10 as Rank, lines: i % 3 === 0 ? 2 : 1 })),
  // rank 20 신규주문 (6) — 그중 1건 cancel_requested
  ...repeat(6, (i) => ({
    rank: 20 as Rank,
    ...(i === 0
      ? {
          claim: {
            type: 'cancel' as const,
            status: 'cancel_requested' as const,
            reason: '구매자 변심',
          },
        }
      : {}),
  })),
  // rank 25 주문보류 (3) — heldFromStatus = 20 (신규주문에서 보류)
  ...repeat(3, () => ({
    rank: 25 as Rank,
    hold: 'order_hold' as const,
    heldFromStatus: 20 as Rank,
  })),
  // rank 30 출고대기 (8) — 그중 1건 묶음 primary
  ...repeat(8, (i) => ({
    rank: 30 as Rank,
    ...(i === 0
      ? { bundleNumber: 'BUNDLE-001', bundlePrimary: true }
      : i === 1
        ? { bundleNumber: 'BUNDLE-001' }
        : {}),
  })),
  // rank 35 출고보류 (3) — heldFromStatus = 30
  ...repeat(3, () => ({
    rank: 35 as Rank,
    hold: 'dispatch_hold' as const,
    heldFromStatus: 30 as Rank,
  })),
  // rank 40 운송장출력 (4)
  ...repeat(4, () => ({ rank: 40 as Rank })),
  // rank 50 출고완료 (6) — 1건 requires_recheck (syncLocked)
  ...repeat(6, (i) => ({
    rank: 50 as Rank,
    ...(i === 0
      ? {
          syncLocked: true,
          claim: {
            type: 'cancel' as const,
            status: 'requires_recheck' as const,
            reason: '채널 응답과 로컬 상태 불일치 — 운영자 확인 필요',
          },
        }
      : {}),
  })),
  // rank 60 배송중 (5) — 1건 return_in_progress
  ...repeat(5, (i) => ({
    rank: 60 as Rank,
    ...(i === 0
      ? {
          claim: {
            type: 'return' as const,
            status: 'return_in_progress' as const,
            reason: '오배송 — 회수 진행 중',
          },
        }
      : {}),
  })),
  // rank 70 배송완료 (3)
  ...repeat(3, () => ({ rank: 70 as Rank })),
  // rank 80 구매결정 (2) — 1건 exchange_done
  ...repeat(2, (i) => ({
    rank: 80 as Rank,
    ...(i === 0
      ? {
          claim: {
            type: 'exchange' as const,
            status: 'exchange_done' as const,
            reason: '사이즈 교환 완료',
          },
        }
      : {}),
  })),
  // rank 90 판매완료 (2)
  ...repeat(2, () => ({ rank: 90 as Rank })),
];

function repeat<T>(n: number, fn: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => fn(i));
}

function pad(n: number, width = 4): string {
  return String(n).padStart(width, '0');
}

const BUYERS = [
  { name: '田中 太郎', kana: 'タナカ タロウ', tel: '03-1234-0001', email: 'tanaka@example.jp' },
  { name: '佐藤 花子', kana: 'サトウ ハナコ', tel: '03-1234-0002', email: 'sato@example.jp' },
  { name: '鈴木 一郎', kana: 'スズキ イチロウ', tel: '03-1234-0003', email: 'suzuki@example.jp' },
  { name: '高橋 美咲', kana: 'タカハシ ミサキ', tel: '03-1234-0004', email: 'takahashi@example.jp' },
  { name: '伊藤 健', kana: 'イトウ ケン', tel: '03-1234-0005', email: 'ito@example.jp' },
];

const ITEMS = [
  { code: 'ITEM-A001', title: 'プレミアム緑茶 100g', option: '味:抹茶', price: 1280 },
  { code: 'ITEM-B002', title: 'オーガニックコーヒー豆 200g', option: '焙煎:中煎り', price: 1850 },
  { code: 'ITEM-C003', title: '高級和菓子セット', option: '個数:8個', price: 2400 },
  { code: 'ITEM-D004', title: '京都漆器 茶碗', option: '色:黒', price: 4500 },
  { code: 'ITEM-E005', title: '日本酒 720ml', option: '銘柄:獺祭', price: 3200 },
  { code: 'ITEM-F006', title: '備前焼 湯呑', option: 'サイズ:M', price: 1980 },
];

function buyerFor(i: number) {
  return BUYERS[i % BUYERS.length];
}
function itemFor(i: number) {
  return ITEMS[i % ITEMS.length];
}

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // 1) 채널 보장 — QOO10_JP 1건 (없으면 자격증명 없이 INSERT)
    const existing = await db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.channelType, 'QOO10_JP'))
      .limit(1);

    let channelId: string;
    if (existing.length > 0) {
      channelId = existing[0].id;
      console.log(`✓ 기존 QOO10_JP 채널 사용: ${channelId}`);
    } else {
      const [created] = await db
        .insert(channels)
        .values({
          channelType: 'QOO10_JP',
          name: 'Qoo10 JP (seed)',
          adapterVersion: '1.0.0',
          status: 'PENDING',
        })
        .returning({ id: channels.id });
      channelId = created.id;
      console.log(`✓ QOO10_JP 채널 신규 생성: ${channelId}`);
    }

    // 2) 기존 SEED-* 주문 정리 (재실행 가능하게)
    const deleted = await db
      .delete(orders)
      .where(and(eq(orders.channelId, channelId), like(orders.channelOrderId, 'SEED-%')))
      .returning({ id: orders.id });
    if (deleted.length > 0) {
      console.log(`✓ 기존 SEED-* 주문 ${deleted.length}건 삭제 (cascade로 items/history 함께)`);
    }

    // 3) 50건 INSERT
    let insertedOrders = 0;
    let insertedItems = 0;
    let insertedHistory = 0;

    for (let i = 0; i < SPECS.length; i++) {
      const spec = SPECS[i];
      const buyer = buyerFor(i);
      const orderedAt = daysAgo(SPECS.length - i); // 옛것부터 최근으로
      const paidAt = spec.rank >= 10 ? orderedAt : null;
      const shippedAt = spec.rank >= 50 ? daysAgo(SPECS.length - i - 1) : null;
      const deliveredAt = spec.rank >= 70 ? daysAgo(SPECS.length - i - 3) : null;
      const trackingNo = spec.rank >= 40 ? `TRK${pad(i + 1, 6)}` : null;
      const trackingCarrier = spec.rank >= 40 ? 'YAMATO' : null;

      const lines = spec.lines ?? 1;
      let orderTotal = 0;
      const lineRows: Array<{
        lineNo: number;
        code: string;
        title: string;
        option: string;
        qty: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];
      for (let l = 0; l < lines; l++) {
        const it = itemFor(i + l);
        const qty = (l + 1) % 2 === 0 ? 2 : 1;
        const totalPrice = it.price * qty;
        orderTotal += totalPrice;
        lineRows.push({
          lineNo: l,
          code: it.code,
          title: it.title,
          option: it.option,
          qty,
          unitPrice: it.price,
          totalPrice,
        });
      }
      const shippingRate = 500;
      const grandTotal = orderTotal + shippingRate;

      const [created] = await db
        .insert(orders)
        .values({
          channelId,
          channelOrderId: `SEED-${pad(i + 1)}`,
          channelPackNo: `PK${pad(i + 1, 6)}`,
          channelItemNo: lineRows[0].code,
          buyerName: buyer.name,
          buyerKana: buyer.kana,
          buyerTel: buyer.tel,
          buyerEmail: buyer.email,
          buyerLanguage: 'ja',
          receiverName: buyer.name,
          receiverKana: buyer.kana,
          receiverTel: buyer.tel,
          zipCode: `100-${pad((i % 9999) + 1)}`,
          shippingAddress: `東京都千代田区丸の内1-${(i % 30) + 1}-${(i % 10) + 1}`,
          address1: '東京都千代田区',
          address2: `丸の内1-${(i % 30) + 1}-${(i % 10) + 1}`,
          receiverCountry: 'JP',
          orderedAt,
          paidAt,
          paymentMethod: i % 3 === 0 ? 'CREDIT_CARD' : i % 3 === 1 ? 'KONBINI' : 'BANK_TRANSFER',
          currency: 'JPY',
          orderPrice: String(orderTotal),
          discount: '0',
          cartDiscountSeller: '0',
          cartDiscountChannel: '0',
          total: String(grandTotal),
          shippingWay: 'YAMATO_EXPRESS',
          shippingRate: String(shippingRate),
          shippingRateType: 'Charge',
          shippingDueDate: spec.rank < 50 ? daysAgo(SPECS.length - i - 5) : null,
          shippedAt,
          deliveredAt,
          trackingCarrier,
          trackingNo,
          fulfillmentStatus: spec.rank,
          claimStatus: spec.claim?.status ?? null,
          claimType: spec.claim?.type ?? null,
          claimReason: spec.claim?.reason ?? null,
          claimRequestedAt: spec.claim ? daysAgo(SPECS.length - i - 1) : null,
          claimResolvedAt:
            spec.claim?.status?.endsWith('_done') ?? false ? daysAgo(SPECS.length - i - 2) : null,
          syncLocked: spec.syncLocked ?? false,
          holdStatus: spec.hold ?? null,
          heldFromStatus: spec.heldFromStatus ?? null,
          dispatchHoldReason: spec.hold === 'dispatch_hold' ? '재고 부족 — 입고 대기' : null,
          bundleNumber: spec.bundleNumber ?? null,
          bundleRoleIsPrimary: spec.bundlePrimary ?? false,
          autoMatched: i % 4 !== 0,
          matchedBy: i % 4 === 0 ? null : i % 2 === 0 ? 'auto' : 'rule',
          rawData: { seed: true, idx: i + 1 },
        })
        .returning({ id: orders.id });

      insertedOrders++;

      // order_items
      for (const lr of lineRows) {
        await db.insert(orderItems).values({
          orderId: created.id,
          lineNo: lr.lineNo,
          channelItemCode: lr.code,
          channelItemTitle: lr.title,
          channelOption: lr.option,
          orderQty: lr.qty,
          unitPrice: String(lr.unitPrice),
          totalPrice: String(lr.totalPrice),
          outputQty: lr.qty,
        });
        insertedItems++;
      }

      // status history: rank > 10인 경우 결제완료(10) → 현재 rank 로 한 줄
      if (spec.rank !== 10) {
        await db.insert(orderStatusHistory).values({
          orderId: created.id,
          fromFulfillment: 10,
          toFulfillment: spec.rank,
          actor: 'system',
          actorId: 'seed',
          reason: 'seed initial transition',
        });
        insertedHistory++;
      }
      // hold 케이스: heldFromStatus → 25/35 로 가는 추가 transition
      if (spec.hold && spec.heldFromStatus) {
        await db.insert(orderStatusHistory).values({
          orderId: created.id,
          fromFulfillment: spec.heldFromStatus,
          toFulfillment: spec.rank,
          actor: 'user',
          actorId: 'seed-operator',
          reason: spec.hold === 'order_hold' ? '주문 보류 처리' : '출고 보류 처리',
        });
        insertedHistory++;
      }
      // claim 케이스: claim 발생 기록
      if (spec.claim) {
        await db.insert(orderStatusHistory).values({
          orderId: created.id,
          toClaim: spec.claim.status,
          actor: spec.claim.status === 'requires_recheck' ? 'system' : 'channel',
          actorId: spec.claim.status === 'requires_recheck' ? 'sync-guard' : 'qoo10',
          reason: spec.claim.reason,
        });
        insertedHistory++;
      }
    }

    console.log(`✓ orders ${insertedOrders}건 / items ${insertedItems}건 / history ${insertedHistory}건 INSERT 완료`);

    // 검증 쿼리
    const counts = await pool.query<{ fulfillment_status: number; count: string }>(
      `SELECT fulfillment_status, count(*)::int as count
       FROM orders WHERE channel_id = $1 AND channel_order_id LIKE 'SEED-%'
       GROUP BY fulfillment_status ORDER BY fulfillment_status`,
      [channelId],
    );
    console.log('\n--- fulfillment_status 분포 ---');
    for (const r of counts.rows) {
      console.log(`  rank ${r.fulfillment_status}: ${r.count}건`);
    }

    const claims = await pool.query<{ claim_status: string; count: string }>(
      `SELECT claim_status, count(*)::int as count
       FROM orders WHERE channel_id = $1 AND channel_order_id LIKE 'SEED-%' AND claim_status IS NOT NULL
       GROUP BY claim_status ORDER BY claim_status`,
      [channelId],
    );
    if (claims.rows.length > 0) {
      console.log('\n--- claim_status 분포 ---');
      for (const r of claims.rows) {
        console.log(`  ${r.claim_status}: ${r.count}건`);
      }
    }

    const holds = await pool.query<{ hold_status: string; count: string }>(
      `SELECT hold_status, count(*)::int as count
       FROM orders WHERE channel_id = $1 AND channel_order_id LIKE 'SEED-%' AND hold_status IS NOT NULL
       GROUP BY hold_status ORDER BY hold_status`,
      [channelId],
    );
    if (holds.rows.length > 0) {
      console.log('\n--- hold_status 분포 ---');
      for (const r of holds.rows) {
        console.log(`  ${r.hold_status}: ${r.count}건`);
      }
    }
  } finally {
    await pool.end();
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
