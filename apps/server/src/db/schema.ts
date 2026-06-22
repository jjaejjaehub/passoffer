import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  numeric,
  boolean,
  varchar,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────

export const channelTypeEnum = pgEnum("channel_type", [
  "QOO10_JP",
  "SHOPEE",
  "RAKUTEN",
  "SHOPIFY",
  "CUSTOM",
]);

export const channelStatusEnum = pgEnum("channel_status", [
  "ACTIVE",
  "INACTIVE",
  "PENDING",
]);

export const credentialTypeEnum = pgEnum("credential_type", [
  "API_KEY",
  "COOKIE",
  "OAUTH",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "PAID",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "CLAIMED",
  "RETURNED",
]);

// ─── users ──────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── channels ───────────────────────────────────────────────────

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  channelType: channelTypeEnum("channel_type").notNull(),
  name: text("name").notNull(),
  status: channelStatusEnum("status").notNull().default("PENDING"),
  adapterVersion: text("adapter_version").notNull().default("1.0.0"),
  mappingSchema: jsonb("mapping_schema"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── channel_credentials ────────────────────────────────────────

export const channelCredentials = pgTable("channel_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelId: uuid("channel_id")
    .notNull()
    .references(() => channels.id, { onDelete: "cascade" }),
  credentialType: credentialTypeEnum("credential_type").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── orders ─────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  channelId: uuid("channel_id")
    .notNull()
    .references(() => channels.id),
  channelOrderId: text("channel_order_id").notNull(),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  orderedAt: timestamp("ordered_at").notNull(),
  // 구매자
  buyerName: text("buyer_name"),
  buyerKana: text("buyer_kana"),
  buyerPhone: text("buyer_phone"),
  buyerEmail: text("buyer_email"),
  // 배송지
  receiver: text("receiver"),
  shippingAddress: text("shipping_address"),
  zipCode: text("zip_code"),
  // 결제
  currency: text("currency").notNull().default("JPY"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  krwAmount: numeric("krw_amount", { precision: 12, scale: 2 }),
  paymentMethod: text("payment_method"),
  // 배송
  carrierId: text("carrier_id"),
  trackingNumber: text("tracking_number"),
  shipDate: timestamp("ship_date"),
  // 원본 데이터
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── order_items ────────────────────────────────────────────────

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  option: text("option"),
  sku: varchar("sku", { length: 128 }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── products ───────────────────────────────────────────────────

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  channelId: uuid("channel_id")
    .notNull()
    .references(() => channels.id),
  channelItemCode: text("channel_item_code").notNull(),
  status: text("status").notNull().default("inactive"),
  title: text("title").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }),
  settlePrice: numeric("settle_price", { precision: 12, scale: 2 }),
  retailPrice: numeric("retail_price", { precision: 12, scale: 2 }),
  qty: integer("qty").default(0),
  categoryMainCode: text("category_main_code"),
  categoryMainName: text("category_main_name"),
  categorySub1Code: text("category_sub1_code"),
  categorySub1Name: text("category_sub1_name"),
  categorySub2Code: text("category_sub2_code"),
  categorySub2Name: text("category_sub2_name"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── master_products ────────────────────────────────────────────

export const masterProducts = pgTable("master_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // 기본 정보
  code: varchar("code", { length: 64 }).notNull(), // passoffer 내부 상품 코드
  title: varchar("title", { length: 255 }).notNull(), // 원본 상품명 (제약 없음)
  descriptionHtml: text("description_html"), // 상품 설명 (HTML)
  brand: varchar("brand", { length: 128 }),
  // 통관 정보
  hsCode: varchar("hs_code", { length: 20 }),
  countryOfOrigin: varchar("country_of_origin", { length: 64 }),
  // 물리 정보
  material: varchar("material", { length: 256 }),
  weightG: integer("weight_g"), // 무게 (g)
  // 가격
  retailPrice: numeric("retail_price", { precision: 12, scale: 2 }),
  // 미디어
  images: jsonb("images").default([]), // Array<{ url, altText, order }>
  // 확장 필드 (플랫폼 추가 시 마이그레이션 없이 확장)
  tags: jsonb("tags").default([]), // string[]
  attributes: jsonb("attributes").default({}), // { [key]: value } 플랫폼별 메타
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── master_product_variants ─────────────────────────────────────
// 다축 옵션 모델: 옵션 명/값은 master_product_option_groups / option_values 로 정규화.
// variant 자체는 sku/price/stock 만 보유하고, 옵션 조합은 variant_option_values join 으로 결정.

export const masterProductVariants = pgTable("master_product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  masterProductId: uuid("master_product_id")
    .notNull()
    .references(() => masterProducts.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 128 }).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  extraAttributes: jsonb("extra_attributes").default({}), // 변형별 확장 필드
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── master_product_option_groups ────────────────────────────────
// 옵션 축 (예: "색상", "사이즈"). 마스터상품 단위.

export const masterProductOptionGroups = pgTable(
  "master_product_option_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    masterProductId: uuid("master_product_id")
      .notNull()
      .references(() => masterProducts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(), // "색상"
    position: integer("position").notNull().default(0), // 축 순서 (0=첫번째)
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("uq_mpog_master_name").on(t.masterProductId, t.name),
    unique("uq_mpog_master_position").on(t.masterProductId, t.position),
  ],
);

// ─── master_product_option_values ────────────────────────────────
// 옵션 값 (예: "빨강", "파랑", "S", "M"). 그룹 단위.

export const masterProductOptionValues = pgTable(
  "master_product_option_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => masterProductOptionGroups.id, { onDelete: "cascade" }),
    value: varchar("value", { length: 128 }).notNull(), // "빨강"
    position: integer("position").notNull().default(0), // 값 순서
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("uq_mpov_group_value").on(t.groupId, t.value),
    unique("uq_mpov_group_position").on(t.groupId, t.position),
  ],
);

// ─── master_product_variant_option_values ────────────────────────
// variant ↔ optionValue 다대다 매핑.
// 한 variant 는 한 group 당 정확히 하나의 value 를 가져야 한다 (앱 레이어에서 검증).

export const masterProductVariantOptionValues = pgTable(
  "master_product_variant_option_values",
  {
    variantId: uuid("variant_id")
      .notNull()
      .references(() => masterProductVariants.id, { onDelete: "cascade" }),
    optionValueId: uuid("option_value_id")
      .notNull()
      .references(() => masterProductOptionValues.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ name: "pk_mpvov", columns: [t.variantId, t.optionValueId] }),
  ],
);

// ─── listed_products ─────────────────────────────────────────────
// 마스터 ↔ 채널 상품 간 연결(link) 정보만 저장. 채널 상품 본체는 항상 API 실시간 fetch.

export const listedProducts = pgTable("listed_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  masterProductId: uuid("master_product_id")
    .notNull()
    .references(() => masterProducts.id, { onDelete: "cascade" }),
  channelId: uuid("channel_id")
    .notNull()
    .references(() => channels.id, { onDelete: "cascade" }),
  channelItemId: varchar("channel_item_id", { length: 256 }).notNull(), // 채널 고유 상품 ID (Qoo10 ItemCode 등)
  linkedAt: timestamp("linked_at").notNull().defaultNow(),
  channelData: jsonb("channel_data").default({}), // _salesPullBaselineAt, _lastSalesPullAt, _processedOrderIds
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── listed_product_variant_links ────────────────────────────────
// 마스터 variant ↔ 채널 옵션 매핑 테이블

export const listedProductVariantLinks = pgTable(
  "listed_product_variant_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listedProductId: uuid("listed_product_id")
      .notNull()
      .references(() => listedProducts.id, { onDelete: "cascade" }),
    masterVariantId: uuid("master_variant_id")
      .notNull()
      .references(() => masterProductVariants.id, { onDelete: "cascade" }),
    channelVariantId: varchar("channel_variant_id", { length: 256 }).notNull(), // 채널 옵션 고유 ID
    channelSellerCode: varchar("channel_seller_code", { length: 256 }), // 매핑 당시 SellerCode (표시용)
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("uq_lpvl_listed_master").on(t.listedProductId, t.masterVariantId),
    unique("uq_lpvl_listed_channel").on(t.listedProductId, t.channelVariantId),
  ],
);

// ─── master_stock_ledger ─────────────────────────────────────────

export const masterStockLedgerTypeEnum = pgEnum("master_stock_ledger_type", [
  "SALE", // 채널 주문으로 인한 차감
  "MANUAL_ADJUST", // 사용자가 수동으로 재고 변경
  "SYNC_RESET", // 마스터 → 채널 push (재고 초기화 기준점)
]);

export const masterStockLedgerRefTypeEnum = pgEnum(
  "master_stock_ledger_ref_type",
  ["ORDER", "USER", "SYNC"],
);

export const masterStockLedger = pgTable("master_stock_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => masterProductVariants.id, { onDelete: "cascade" }),
  type: masterStockLedgerTypeEnum("type").notNull(),
  qtyDelta: integer("qty_delta").notNull(), // 음수=차감, 양수=증가/초기화
  prevStock: integer("prev_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  refType: masterStockLedgerRefTypeEnum("ref_type").notNull(),
  refId: varchar("ref_id", { length: 256 }), // ORDER: 채널 주문 ID, USER: userId, SYNC: listedProductId
  channelId: uuid("channel_id").references(() => channels.id, {
    onDelete: "set null",
  }),
  listedProductId: uuid("listed_product_id").references(
    () => listedProducts.id,
    { onDelete: "set null" },
  ),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── claims ─────────────────────────────────────────────────────

// ─── WMS 테이블 ──────────────────────────────────────────────────

export const wmsVendorEnum = pgEnum("wms_vendor", [
  "self",
  "cj_logistics",
  "hanjin",
  "sftp_batch",
  "custom",
]);

export const wmsStatusEnum = pgEnum("wms_status", [
  "ACTIVE",
  "INACTIVE",
  "PENDING",
]);

export const inboundStatusEnum = pgEnum("inbound_status", [
  "pending_dispatch",
  "instructed",
  "received",
  "canceled",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "inbound",
  "outbound",
  "transfer",
  "adjustment",
]);

export const movementStatusEnum = pgEnum("movement_status", [
  "applied",
  "pending_external",
  "failed",
]);

export const warehouses = pgTable("warehouses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  vendor: wmsVendorEnum("vendor").notNull(),
  syncMode: varchar("sync_mode", { length: 32 }).notNull().default("manual"),
  status: wmsStatusEnum("status").notNull().default("PENDING"),
  capabilitiesJson: jsonb("capabilities_json").default({}),
  configJson: jsonb("config_json").default({}), // endpoint, apiKey (encrypted), etc.
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const warehouseLocations = pgTable("warehouse_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  level: integer("level").notNull().default(1),
  fullPath: varchar("full_path", { length: 512 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const warehouseStocks = pgTable("warehouse_stocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "cascade" }),
  masterProductId: uuid("master_product_id").references(
    () => masterProducts.id,
    { onDelete: "set null" },
  ),
  masterVariantSku: varchar("master_variant_sku", { length: 128 }).notNull(),
  vendorSku: varchar("vendor_sku", { length: 128 }), // WMS 벤더측 SKU (매핑 테이블)
  locationId: uuid("location_id").references(() => warehouseLocations.id, {
    onDelete: "set null",
  }),
  lotCode: varchar("lot_code", { length: 128 }),
  quantity: integer("quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  sourceVendor: wmsVendorEnum("source_vendor").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  freshness: varchar("freshness", { length: 16 }).notNull().default("unknown"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inboundOrders = pgTable("inbound_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "cascade" }),
  status: inboundStatusEnum("status").notNull().default("pending_dispatch"),
  vendorRef: varchar("vendor_ref", { length: 256 }),
  expectedAt: timestamp("expected_at"),
  itemsJson: jsonb("items_json").default([]), // InboundItem[]
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "cascade" }),
  type: movementTypeEnum("type").notNull(),
  status: movementStatusEnum("status").notNull().default("applied"),
  vendorRef: varchar("vendor_ref", { length: 256 }),
  reasonCode: varchar("reason_code", { length: 64 }),
  payloadJson: jsonb("payload_json").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  channelId: uuid("channel_id")
    .notNull()
    .references(() => channels.id),
  orderNo: text("order_no").notNull(),
  claimStatus: text("claim_status").notNull(),
  reason: text("reason"),
  requestDate: timestamp("request_date"),
  cancelRefundDate: timestamp("cancel_refund_date"),
  // 구매자
  buyer: text("buyer"),
  buyerMobile: text("buyer_mobile"),
  // 수취인
  receiver: text("receiver"),
  receiverMobile: text("receiver_mobile"),
  // 배송
  trackingNo: text("tracking_no"),
  deliveryCompany: text("delivery_company"),
  trackingNoReturn: text("tracking_no_return"),
  deliveryCompanyReturn: text("delivery_company_return"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
