/**
 * 창고 더미 데이터 시드
 *
 * 실행 방법:
 *   tsx src/db/seed-warehouses.ts
 *
 * 사전 조건:
 *   - apps/server/.env 파일에 DATABASE_URL 설정
 *   - 기존 유저가 최소 1명 존재해야 함 (users 테이블)
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  inboundOrders,
  masterProducts,
  masterProductVariants,
  stockMovements,
  users,
  warehouseLocations,
  warehouseStocks,
  warehouses,
} from "./schema";

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // 모든 유저 가져오기
    const allUsers = await db.select().from(users);
    if (!allUsers.length)
      throw new Error("유저가 없습니다. 먼저 유저를 생성하세요.");
    console.log(`✓ 유저 확인: ${allUsers.map((u) => u.email).join(", ")}`);

    for (const user of allUsers) {
      await seedForUser(db, user);
    }

    console.log("");
    console.log("=== 창고 더미 데이터 시드 완료 ===");
    console.log(`대상 유저: ${allUsers.length}명`);
    console.log(
      "유저당: 창고 3개, 로케이션 7개, 재고 7건, 입고 4건, 이동이력 5건",
    );
  } finally {
    await pool.end();
  }
}

async function seedForUser(
  db: ReturnType<typeof drizzle>,
  user: { id: string; email: string },
) {
  console.log(`\n--- ${user.email} ---`);

  // 마스터 상품 가져오기 (재고 연결용)
  const productList = await db
    .select()
    .from(masterProducts)
    .where(eq(masterProducts.userId, user.id))
    .limit(5);

  const variantList = productList.length
    ? await db.select().from(masterProductVariants).limit(10)
    : [];

  // ─── 1. 창고 생성 ────────────────────────────────────────────

  const [selfWarehouse] = await db
    .insert(warehouses)
    .values({
      userId: user.id,
      code: "WH-SELF-001",
      name: "본사 자체 창고",
      vendor: "self",
      syncMode: "manual",
      status: "ACTIVE",
      capabilitiesJson: {
        inbound: true,
        outbound: true,
        stockQuery: true,
        locationManagement: true,
      },
      configJson: {},
    })
    .returning();
  console.log(`✓ 창고 생성: ${selfWarehouse!.name}`);

  const [cjWarehouse] = await db
    .insert(warehouses)
    .values({
      userId: user.id,
      code: "WH-CJ-001",
      name: "CJ대한통운 풀필먼트 센터",
      vendor: "cj_logistics",
      syncMode: "auto",
      status: "ACTIVE",
      capabilitiesJson: {
        inbound: true,
        outbound: true,
        stockQuery: true,
        locationManagement: false,
      },
      configJson: {
        endpoint: "https://api.cjlogistics.example.com/v2",
        customerId: "MIRAISE001",
      },
      lastSyncAt: new Date("2026-05-11T03:00:00Z"),
    })
    .returning();
  console.log(`✓ 창고 생성: ${cjWarehouse!.name}`);

  const [sftpWarehouse] = await db
    .insert(warehouses)
    .values({
      userId: user.id,
      code: "WH-SFTP-001",
      name: "외부 파트너 창고 (SFTP)",
      vendor: "sftp_batch",
      syncMode: "scheduled",
      status: "PENDING",
      capabilitiesJson: {
        inbound: false,
        outbound: true,
        stockQuery: true,
        locationManagement: false,
      },
      configJson: {
        host: "sftp.partner-wms.example.com",
        port: 22,
        username: "miraise_wms",
      },
    })
    .returning();
  console.log(`✓ 창고 생성: ${sftpWarehouse!.name}`);

  // ─── 2. 창고 위치(로케이션) 생성 ─────────────────────────────

  // 자체 창고 로케이션: A동 → A-1존 → A-1-01 선반
  const [zoneA] = await db
    .insert(warehouseLocations)
    .values({
      warehouseId: selfWarehouse!.id,
      code: "A",
      name: "A동",
      level: 1,
      fullPath: "A",
    })
    .returning();

  const [zoneA1] = await db
    .insert(warehouseLocations)
    .values({
      warehouseId: selfWarehouse!.id,
      parentId: zoneA!.id,
      code: "A-1",
      name: "A-1존",
      level: 2,
      fullPath: "A > A-1",
    })
    .returning();

  const shelfRows = ["A-1-01", "A-1-02", "A-1-03"].map((code) => ({
    warehouseId: selfWarehouse!.id,
    parentId: zoneA1!.id,
    code,
    name: `${code} 선반`,
    level: 3,
    fullPath: `A > A-1 > ${code}`,
  }));
  const shelves = await db
    .insert(warehouseLocations)
    .values(shelfRows)
    .returning();
  console.log(`✓ 로케이션 생성: ${shelves.length + 2}개 (A동 계층)`);

  // B동
  const [zoneB] = await db
    .insert(warehouseLocations)
    .values({
      warehouseId: selfWarehouse!.id,
      code: "B",
      name: "B동 (냉장)",
      level: 1,
      fullPath: "B",
    })
    .returning();

  const [zoneB1] = await db
    .insert(warehouseLocations)
    .values({
      warehouseId: selfWarehouse!.id,
      parentId: zoneB!.id,
      code: "B-1",
      name: "B-1존",
      level: 2,
      fullPath: "B > B-1",
    })
    .returning();
  console.log(`✓ 로케이션 생성: B동 계층`);

  // ─── 3. 재고 생성 ────────────────────────────────────────────

  const dummySkus = variantList.length
    ? variantList.map((v) => ({
        sku: v.sku,
        masterProductId: v.masterProductId,
      }))
    : [
        { sku: "SKU-DEMO-001", masterProductId: null },
        { sku: "SKU-DEMO-002", masterProductId: null },
        { sku: "SKU-DEMO-003", masterProductId: null },
        { sku: "SKU-DEMO-004", masterProductId: null },
        { sku: "SKU-DEMO-005", masterProductId: null },
      ];

  const stockRows = [
    // 자체 창고 재고
    {
      warehouseId: selfWarehouse!.id,
      masterProductId: dummySkus[0]?.masterProductId ?? null,
      masterVariantSku: dummySkus[0]?.sku ?? "SKU-DEMO-001",
      locationId: shelves[0]?.id ?? null,
      quantity: 150,
      reservedQuantity: 20,
      sourceVendor: "self" as const,
      freshness: "fresh",
      lastSyncAt: new Date(),
    },
    {
      warehouseId: selfWarehouse!.id,
      masterProductId: dummySkus[1]?.masterProductId ?? null,
      masterVariantSku: dummySkus[1]?.sku ?? "SKU-DEMO-002",
      locationId: shelves[1]?.id ?? null,
      quantity: 80,
      reservedQuantity: 5,
      sourceVendor: "self" as const,
      freshness: "fresh",
      lastSyncAt: new Date(),
    },
    {
      warehouseId: selfWarehouse!.id,
      masterProductId: dummySkus[2]?.masterProductId ?? null,
      masterVariantSku: dummySkus[2]?.sku ?? "SKU-DEMO-003",
      locationId: shelves[2]?.id ?? null,
      quantity: 30,
      reservedQuantity: 0,
      sourceVendor: "self" as const,
      freshness: "stale",
      lastSyncAt: new Date("2026-05-09T10:00:00Z"),
    },
    // 냉장존 재고
    {
      warehouseId: selfWarehouse!.id,
      masterProductId: dummySkus[3]?.masterProductId ?? null,
      masterVariantSku: dummySkus[3]?.sku ?? "SKU-DEMO-004",
      locationId: zoneB1!.id,
      quantity: 200,
      reservedQuantity: 50,
      lotCode: "LOT-2026-04-B",
      sourceVendor: "self" as const,
      freshness: "fresh",
      lastSyncAt: new Date(),
    },
    // CJ 창고 재고
    {
      warehouseId: cjWarehouse!.id,
      masterProductId: dummySkus[0]?.masterProductId ?? null,
      masterVariantSku: dummySkus[0]?.sku ?? "SKU-DEMO-001",
      vendorSku: "CJ-EXT-10001",
      quantity: 320,
      reservedQuantity: 80,
      sourceVendor: "cj_logistics" as const,
      freshness: "fresh",
      lastSyncAt: new Date("2026-05-11T03:00:00Z"),
    },
    {
      warehouseId: cjWarehouse!.id,
      masterProductId: dummySkus[1]?.masterProductId ?? null,
      masterVariantSku: dummySkus[1]?.sku ?? "SKU-DEMO-002",
      vendorSku: "CJ-EXT-10002",
      quantity: 0,
      reservedQuantity: 0,
      sourceVendor: "cj_logistics" as const,
      freshness: "fresh",
      lastSyncAt: new Date("2026-05-11T03:00:00Z"),
    },
    {
      warehouseId: cjWarehouse!.id,
      masterProductId: dummySkus[4]?.masterProductId ?? null,
      masterVariantSku: dummySkus[4]?.sku ?? "SKU-DEMO-005",
      vendorSku: "CJ-EXT-10005",
      quantity: 55,
      reservedQuantity: 10,
      lotCode: "LOT-2026-05-A",
      sourceVendor: "cj_logistics" as const,
      freshness: "fresh",
      lastSyncAt: new Date("2026-05-11T03:00:00Z"),
    },
  ];

  await db.insert(warehouseStocks).values(stockRows);
  console.log(`✓ 재고 생성: ${stockRows.length}건`);

  // ─── 4. 입고 지시 생성 ───────────────────────────────────────

  const inboundRows = [
    {
      userId: user.id,
      warehouseId: selfWarehouse!.id,
      status: "received" as const,
      vendorRef: "PO-2026-0501",
      expectedAt: new Date("2026-05-05T09:00:00Z"),
      itemsJson: [
        {
          sku: dummySkus[0]?.sku ?? "SKU-DEMO-001",
          qty: 100,
          receivedQty: 100,
        },
        { sku: dummySkus[1]?.sku ?? "SKU-DEMO-002", qty: 50, receivedQty: 50 },
      ],
      note: "5월 1차 입고 완료",
    },
    {
      userId: user.id,
      warehouseId: selfWarehouse!.id,
      status: "instructed" as const,
      vendorRef: "PO-2026-0512",
      expectedAt: new Date("2026-05-14T09:00:00Z"),
      itemsJson: [
        { sku: dummySkus[2]?.sku ?? "SKU-DEMO-003", qty: 200 },
        { sku: dummySkus[4]?.sku ?? "SKU-DEMO-005", qty: 150 },
      ],
      note: "5월 2차 입고 예정",
    },
    {
      userId: user.id,
      warehouseId: cjWarehouse!.id,
      status: "pending_dispatch" as const,
      vendorRef: "PO-2026-CJ-0501",
      expectedAt: new Date("2026-05-20T00:00:00Z"),
      itemsJson: [{ sku: dummySkus[0]?.sku ?? "SKU-DEMO-001", qty: 500 }],
      note: "CJ 풀필먼트 보충 입고",
    },
    {
      userId: user.id,
      warehouseId: selfWarehouse!.id,
      status: "canceled" as const,
      vendorRef: "PO-2026-0430",
      expectedAt: new Date("2026-04-30T09:00:00Z"),
      itemsJson: [{ sku: dummySkus[3]?.sku ?? "SKU-DEMO-004", qty: 100 }],
      note: "공급사 사정으로 취소",
    },
  ];

  await db.insert(inboundOrders).values(inboundRows);
  console.log(`✓ 입고 지시 생성: ${inboundRows.length}건`);

  // ─── 5. 재고 이동 이력 생성 ──────────────────────────────────

  const movementRows = [
    {
      userId: user.id,
      warehouseId: selfWarehouse!.id,
      type: "inbound" as const,
      status: "applied" as const,
      vendorRef: "PO-2026-0501",
      reasonCode: "purchase_order",
      payloadJson: {
        items: [
          {
            sku: dummySkus[0]?.sku ?? "SKU-DEMO-001",
            qty: 100,
            locationCode: "A-1-01",
          },
          {
            sku: dummySkus[1]?.sku ?? "SKU-DEMO-002",
            qty: 50,
            locationCode: "A-1-02",
          },
        ],
      },
    },
    {
      userId: user.id,
      warehouseId: selfWarehouse!.id,
      type: "outbound" as const,
      status: "applied" as const,
      vendorRef: "ORD-2026-05-1001",
      reasonCode: "sales_order",
      payloadJson: {
        items: [{ sku: dummySkus[0]?.sku ?? "SKU-DEMO-001", qty: 5 }],
      },
    },
    {
      userId: user.id,
      warehouseId: selfWarehouse!.id,
      type: "adjustment" as const,
      status: "applied" as const,
      reasonCode: "cycle_count",
      payloadJson: {
        items: [
          {
            sku: dummySkus[2]?.sku ?? "SKU-DEMO-003",
            delta: -3,
            reason: "실사 차이",
          },
        ],
      },
    },
    {
      userId: user.id,
      warehouseId: selfWarehouse!.id,
      type: "transfer" as const,
      status: "applied" as const,
      reasonCode: "location_change",
      payloadJson: {
        items: [
          {
            sku: dummySkus[1]?.sku ?? "SKU-DEMO-002",
            qty: 20,
            fromLocationCode: "A-1-01",
            toLocationCode: "A-1-03",
          },
        ],
      },
    },
    {
      userId: user.id,
      warehouseId: cjWarehouse!.id,
      type: "inbound" as const,
      status: "pending_external" as const,
      vendorRef: "CJ-RECV-20260511-001",
      reasonCode: "purchase_order",
      payloadJson: {
        items: [
          {
            sku: dummySkus[4]?.sku ?? "SKU-DEMO-005",
            qty: 55,
            vendorSku: "CJ-EXT-10005",
          },
        ],
      },
    },
  ];

  await db.insert(stockMovements).values(movementRows);
  console.log(`✓ 재고 이동 이력 생성: ${movementRows.length}건`);
}

seed().catch((err) => {
  console.error("Seed 실패:", err);
  process.exit(1);
});
