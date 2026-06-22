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
  smallint,
  unique,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

// ─── Enums ──────────────────────────────────────────────────────

export const channelTypeEnum = pgEnum('channel_type', [
  'QOO10_JP',
  'SHOPEE',
  'RAKUTEN',
  'SHOPIFY',
  'CUSTOM',
]);

export const channelStatusEnum = pgEnum('channel_status', [
  'ACTIVE',
  'INACTIVE',
  'PENDING',
]);

export const credentialTypeEnum = pgEnum('credential_type', [
  'API_KEY',
  'COOKIE',
  'OAUTH',
]);

// fulfillment_status 는 smallint rank(10~90) 로 저장. [[standard-order-v2]] §7, [[decisions]] C-1.
//   10 결제완료, 20 신규주문, 25 주문보류, 30 출고대기, 35 출고보류, 40 운송장출력,
//   50 출고완료, 60 배송중, 70 배송완료, 80 구매결정, 90 판매완료(불가침)

export const claimTypeEnum = pgEnum('claim_type', [
  'cancel',
  'return',
  'exchange',
  'swap',
]);

// [[decisions]] C-2. 미수취 추가 여부는 G-Q1 미결 → 우선 13종으로 확정.
export const claimStatusEnum = pgEnum('claim_status', [
  'cancel_requested',
  'cancel_done',
  'return_requested',
  'return_in_progress',
  'return_collected',
  'return_done',
  'exchange_requested',
  'exchange_in_progress',
  'exchange_collected',
  'exchange_done',
  'swap_requested',
  'swap_done',
  'requires_recheck',
]);

export const orderActorEnum = pgEnum('order_actor', ['channel', 'user', 'system']);
export const orderMatchedByEnum = pgEnum('order_matched_by', ['auto', 'manual', 'rule']);

export const orderEventLogTypeEnum = pgEnum('order_event_log_type', [
  'auto_match_success',
  'auto_match_failed',
  'duplicate_suspect',
  'status_sync',
  'collect_error',
  'rule_auto_learned',
]);
export const orderEventLogResultEnum = pgEnum('order_event_log_result', ['ok', 'warn', 'error']);

export const listedProductSyncStatusEnum = pgEnum('listed_product_sync_status', [
  'PENDING',
  'SYNCED',
  'ERROR',
]);

// ─── users ──────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── channels ───────────────────────────────────────────────────

export const channels = pgTable('channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  channelType: channelTypeEnum('channel_type').notNull(),
  name: text('name').notNull(),
  status: channelStatusEnum('status').notNull().default('PENDING'),
  adapterVersion: text('adapter_version').notNull().default('1.0.0'),
  mappingSchema: jsonb('mapping_schema'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── channel_credentials ────────────────────────────────────────

export const channelCredentials = pgTable('channel_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id')
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  credentialType: credentialTypeEnum('credential_type').notNull(),
  encryptedValue: text('encrypted_value').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── orders ─────────────────────────────────────────────────────
// StandardOrder v2 — [[standard-order-v2]] §1~§11 (72컬럼)
// 채널 응답은 결정론적 룩업표를 거쳐 본 테이블로 정규화된다. [[CONVERT_RULES]] §2 참조.

export const orders = pgTable(
  'orders',
  {
    // ── Identity (8) ─────────────────────────────────────────────
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').notNull().references(() => channels.id),
    channelOrderId: text('channel_order_id').notNull(),
    channelPackNo: text('channel_pack_no'),
    channelItemNo: text('channel_item_no'),
    channelAccountId: text('channel_account_id'),
    relatedOrders: jsonb('related_orders').default([]),               // string[] — RelatedOrder split
    // ── Buyer (6) ────────────────────────────────────────────────
    buyerName: text('buyer_name'),
    buyerKana: text('buyer_kana'),
    buyerTel: text('buyer_tel'),
    buyerMobile: text('buyer_mobile'),
    buyerEmail: text('buyer_email'),
    buyerLanguage: text('buyer_language'),
    // ── Receiver (11) ────────────────────────────────────────────
    receiverName: text('receiver_name'),
    receiverKana: text('receiver_kana'),
    receiverTel: text('receiver_tel'),
    receiverMobile: text('receiver_mobile'),
    receiverEmail: text('receiver_email'),
    zipCode: text('zip_code'),
    shippingAddress: text('shipping_address'),
    address1: text('address1'),
    address2: text('address2'),
    receiverCountry: text('receiver_country'),
    desiredDeliveryDate: timestamp('desired_delivery_date'),
    // ── Sender (5) ───────────────────────────────────────────────
    senderName: text('sender_name'),
    senderTel: text('sender_tel'),
    senderNation: text('sender_nation'),
    senderZipCode: text('sender_zip_code'),
    senderAddress: text('sender_address'),
    // ── Payment (9) ──────────────────────────────────────────────
    orderedAt: timestamp('ordered_at').notNull(),
    paidAt: timestamp('paid_at'),
    paymentMethod: text('payment_method'),
    currency: text('currency').notNull().default('JPY'),
    orderPrice: numeric('order_price', { precision: 12, scale: 2 }),
    discount: numeric('discount', { precision: 12, scale: 2 }),
    cartDiscountSeller: numeric('cart_discount_seller', { precision: 12, scale: 2 }),
    cartDiscountChannel: numeric('cart_discount_channel', { precision: 12, scale: 2 }),
    total: numeric('total', { precision: 12, scale: 2 }),
    // ── Fulfillment (9) ──────────────────────────────────────────
    shippingWay: text('shipping_way'),
    shippingMessage: text('shipping_message'),
    shippingRate: numeric('shipping_rate', { precision: 12, scale: 2 }),
    shippingRateType: text('shipping_rate_type'),                     // Free|Charge|Free on condition
    shippingDueDate: timestamp('shipping_due_date'),                  // EstimatedShippingDate, 양방향
    shippedAt: timestamp('shipped_at'),
    deliveredAt: timestamp('delivered_at'),
    trackingCarrier: text('tracking_carrier'),                        // fill-if-empty
    trackingNo: text('tracking_no'),                                  // fill-if-empty + 충돌검사
    trackingConflict: boolean('tracking_conflict').notNull().default(false),
    trackingConflictPayload: jsonb('tracking_conflict_payload'),
    // ── Status (8) ───────────────────────────────────────────────
    fulfillmentStatus: smallint('fulfillment_status').notNull().default(10),  // rank 10~90, [[decisions]] C-1
    claimStatus: claimStatusEnum('claim_status'),
    displayStatus: text('display_status'),                            // [[decisions]] A-2 저장 vs derive 미결 → 우선 저장
    isDispatchDelayed: boolean('is_dispatch_delayed').notNull().default(false),
    dispatchHoldReason: text('dispatch_hold_reason'),
    // 주문재확인(requires_recheck) 잠금 — sync 가드 무시 + 운영자 해제 시 단조증가 재진입
    syncLocked: boolean('sync_locked').notNull().default(false),
    // 보류(주문보류 25 / 출고보류 35) 상태에서 원래 rank 보존, 해제 시 복귀
    holdStatus: text('hold_status'),                                  // 'order_hold' | 'dispatch_hold' | null
    heldFromStatus: smallint('held_from_status'),                     // 보류 직전 rank (10~70)
    // ── Claim summary (5) — 상세는 claims 테이블 ────────────────
    claimType: claimTypeEnum('claim_type'),
    claimReason: text('claim_reason'),
    claimRequestedAt: timestamp('claim_requested_at'),
    claimResolvedAt: timestamp('claim_resolved_at'),
    returnTrackingNo: text('return_tracking_no'),
    // ── Bundle (3) ───────────────────────────────────────────────
    bundleNumber: text('bundle_number'),                              // [[decisions]] A-4 b: 묶음번호만 공유
    bundleable: boolean('bundleable').notNull().default(true),
    bundleRoleIsPrimary: boolean('bundle_role_is_primary').notNull().default(false),
    // ── Duplicate detection (1) ──────────────────────────────────
    duplicateGroupKey: text('duplicate_group_key'),                   // 중복의심 감지용 휴리스틱 키
    // ── Audit (5) ────────────────────────────────────────────────
    autoMatched: boolean('auto_matched').notNull().default(false),
    matchedBy: orderMatchedByEnum('matched_by'),
    rawData: jsonb('raw_data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('uq_orders_channel_order').on(t.channelId, t.channelOrderId),
    index('idx_orders_fulfillment_status').on(t.fulfillmentStatus),
    index('idx_orders_bundle_number').on(t.bundleNumber),
    index('idx_orders_ordered_at').on(t.orderedAt),
    index('idx_orders_claim_status').on(t.claimStatus),
    index('idx_orders_paid_at').on(t.paidAt),
    index('idx_orders_channel_auto_matched').on(t.channelId, t.autoMatched),
    index('idx_orders_duplicate_group').on(t.duplicateGroupKey),
  ],
);

// ─── order_items ────────────────────────────────────────────────
// [[standard-order-v2]] §12 — 채널 인입 라인 + SKU 매칭 결과 + 사은품 적용 흔적.

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  lineNo: integer('line_no').notNull().default(0),
  // ── 채널 인입 ────────────────────────────────────────────────
  channelItemCode: text('channel_item_code'),                         // SellerItemCode
  channelItemTitle: text('channel_item_title'),                       // ItemTitle
  channelOption: text('channel_option'),                              // Option 문자열
  channelOptionCode: text('channel_option_code'),                     // OptionCode (SKU 키 우선)
  orderQty: integer('order_qty').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }),
  totalPrice: numeric('total_price', { precision: 12, scale: 2 }),
  // ── SKU 매칭 (match_rules 결과) ──────────────────────────────
  skuId: uuid('sku_id').references(() => skus.id, { onDelete: 'set null' }),
  skuCode: varchar('sku_code', { length: 128 }),
  skuName: varchar('sku_name', { length: 255 }),
  outputQty: integer('output_qty').notNull().default(0),              // 출고수량 = orderQty × BOM qty
  matchedBy: orderMatchedByEnum('matched_by'),                        // null=미매칭, auto=SKU직매칭, rule=규칙적중, manual=수동
  matchRuleId: uuid('match_rule_id').references(() => matchRules.id, { onDelete: 'set null' }),
  // ── 사은품 / 창고 ─────────────────────────────────────────────
  appliedGifts: jsonb('applied_gifts').default([]),                   // [{ ruleId, skuId, qty }]
  warehouseId: uuid('warehouse_id').references(() => warehouses.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── order_status_history ──────────────────────────────────────
// 상태 전이 감사 로그. fulfillment rank 단조증가 검증/롤백/사용자 액션 추적.

export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  fromFulfillment: smallint('from_fulfillment'),
  toFulfillment: smallint('to_fulfillment'),
  fromClaim: claimStatusEnum('from_claim'),
  toClaim: claimStatusEnum('to_claim'),
  actor: orderActorEnum('actor').notNull(),
  actorId: text('actor_id'),                                          // user uuid | channel id | system tag
  reason: text('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── order_event_log ───────────────────────────────────────────
// 자동매칭/중복의심/sync 등 운영 이벤트 로그. orderStatusHistory와 달리 user 단위로 조회.

export const orderEventLog = pgTable(
  'order_event_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'set null' }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    orderItemId: uuid('order_item_id').references(() => orderItems.id, { onDelete: 'set null' }),
    eventType: orderEventLogTypeEnum('event_type').notNull(),
    result: orderEventLogResultEnum('result').notNull(),
    message: text('message'),
    detail: jsonb('detail'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_order_event_log_user_created').on(t.userId, t.createdAt),
    index('idx_order_event_log_event_type').on(t.eventType),
    index('idx_order_event_log_channel').on(t.channelId),
  ],
);

// ─── products ───────────────────────────────────────────────────

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  channelId: uuid('channel_id')
    .notNull()
    .references(() => channels.id),
  channelItemCode: text('channel_item_code').notNull(),
  status: text('status').notNull().default('inactive'),
  title: text('title').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }),
  settlePrice: numeric('settle_price', { precision: 12, scale: 2 }),
  retailPrice: numeric('retail_price', { precision: 12, scale: 2 }),
  qty: integer('qty').default(0),
  categoryMainCode: text('category_main_code'),
  categoryMainName: text('category_main_name'),
  categorySub1Code: text('category_sub1_code'),
  categorySub1Name: text('category_sub1_name'),
  categorySub2Code: text('category_sub2_code'),
  categorySub2Name: text('category_sub2_name'),
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── master_products ────────────────────────────────────────────

export const masterProducts = pgTable('master_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // 기본 정보 (채널 공통)
  code: varchar('code', { length: 64 }).notNull(),           // passoffer 내부 상품 코드
  title: varchar('title', { length: 255 }).notNull(),        // 원본 상품명 (제약 없음)
  // 플랫폼별 추가정보 — { "qoo10.ItemDescription": "...", "shopify.brand": "..." } 네임스페이스 키
  attributes: jsonb('attributes').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── master_product_variants ─────────────────────────────────────
// 다축 옵션 모델: 옵션 명/값은 master_product_option_groups / option_values 로 정규화.
// variant 자체는 sku/price/stock 만 보유하고, 옵션 조합은 variant_option_values join 으로 결정.

export const masterProductVariants = pgTable('master_product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  masterProductId: uuid('master_product_id').notNull().references(() => masterProducts.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 128 }).notNull(),
  price: numeric('price', { precision: 12, scale: 2 }),
  stock: integer('stock').notNull().default(0),
  extraAttributes: jsonb('extra_attributes').default({}),   // 변형별 확장 필드
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── skus ───────────────────────────────────────────────────────
// 재고가 붙는 유일한 실체. 마스터 variant / 채널 옵션 모두 이 SKU를 참조.
// stock 컬럼은 향후 master_product_variants.stock 폐기 후 본 테이블이 유일한 원천이 된다.

export const skus = pgTable(
  'skus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 128 }).notNull(),
    name: varchar('name', { length: 255 }),
    stock: integer('stock').notNull().default(0),
    barcode: varchar('barcode', { length: 64 }),
    attributes: jsonb('attributes').default({}),
    // ── 기본정보 탭 ────────────────────────────────────────────────
    warehouseText: varchar('warehouse_text', { length: 255 }),   // 배송처(추후 마스터화)
    isPrimaryWarehouse: boolean('is_primary_warehouse').notNull().default(false),
    vendorText: varchar('vendor_text', { length: 255 }),         // 매입처(추후 마스터화)
    leadTimeDays: integer('lead_time_days'),
    safetyStock: integer('safety_stock').notNull().default(0),
    modelName: varchar('model_name', { length: 255 }),
    inventoryCode: varchar('inventory_code', { length: 128 }),
    image: text('image'),                                         // 변형별 이미지
    standardCode: varchar('standard_code', { length: 64 }),       // 표준상품코드
    hsCode: varchar('hs_code', { length: 32 }),
    isbn: varchar('isbn', { length: 13 }),
    // ── 규격/가격 탭 ──────────────────────────────────────────────
    isBundlable: boolean('is_bundlable').notNull().default(true), // 합포장 여부
    widthCm: numeric('width_cm', { precision: 10, scale: 2 }),
    heightCm: numeric('height_cm', { precision: 10, scale: 2 }),
    depthCm: numeric('depth_cm', { precision: 10, scale: 2 }),
    weightKg: numeric('weight_kg', { precision: 10, scale: 3 }),
    inboundUnit: numeric('inbound_unit', { precision: 10, scale: 2 }), // 입고단위 수량
    inboundUnitType: varchar('inbound_unit_type', { length: 16 }).default('EA'),
    purchaseCost: numeric('purchase_cost', { precision: 12, scale: 2 }).notNull().default('0'),
    purchaseFreight: numeric('purchase_freight', { precision: 12, scale: 2 }).notNull().default('0'),
    deliveryFee: numeric('delivery_fee', { precision: 12, scale: 2 }).notNull().default('0'),
    adCost: numeric('ad_cost', { precision: 12, scale: 2 }).notNull().default('0'),
    etcCost: numeric('etc_cost', { precision: 12, scale: 2 }).notNull().default('0'),
    supplyPrice: numeric('supply_price', { precision: 12, scale: 2 }),
    salePrice: numeric('sale_price', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 8 }).notNull().default('KRW'),
    // ── 추가정보 탭 ──────────────────────────────────────────────
    originCountry: varchar('origin_country', { length: 64 }),
    originExtras: jsonb('origin_extras').default([]),             // 복수 원산지 체크
    requiresCaution: boolean('requires_caution').notNull().default(false),
    taxType: varchar('tax_type', { length: 16 }).notNull().default('GENERAL'), // GENERAL|ZERO|EXEMPT
    brand: varchar('brand', { length: 128 }),
    manufacturer: varchar('manufacturer', { length: 128 }),
    manufacturerEn: varchar('manufacturer_en', { length: 40 }),
    ageGroup: varchar('age_group', { length: 32 }),
    infoNotice: jsonb('info_notice').default({}),                 // 상품정보제공고시 (카테고리+필드맵)
    mainImage: text('main_image'),
    descriptionHtml: text('description_html'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique('uq_skus_user_code').on(t.userId, t.code)],
);

// ─── master_variant_skus ────────────────────────────────────────
// 마스터 variant 1개를 구성하는 SKU들의 BOM. 단일 SKU는 qty=1 한 행, 번들은 여러 행.

export const masterVariantSkus = pgTable(
  'master_variant_skus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    masterVariantId: uuid('master_variant_id')
      .notNull()
      .references(() => masterProductVariants.id, { onDelete: 'cascade' }),
    skuId: uuid('sku_id').notNull().references(() => skus.id, { onDelete: 'restrict' }),
    qty: integer('qty').notNull().default(1),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique('uq_mvs_variant_sku').on(t.masterVariantId, t.skuId)],
);

// ─── master_product_option_groups ────────────────────────────────
// 옵션 축 (예: "색상", "사이즈"). 마스터상품 단위.

export const masterProductOptionGroups = pgTable(
  'master_product_option_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    masterProductId: uuid('master_product_id')
      .notNull()
      .references(() => masterProducts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),         // "색상"
    position: integer('position').notNull().default(0),       // 축 순서 (0=첫번째)
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('uq_mpog_master_name').on(t.masterProductId, t.name),
    unique('uq_mpog_master_position').on(t.masterProductId, t.position),
  ],
);

// ─── master_product_option_values ────────────────────────────────
// 옵션 값 (예: "빨강", "파랑", "S", "M"). 그룹 단위.

export const masterProductOptionValues = pgTable(
  'master_product_option_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => masterProductOptionGroups.id, { onDelete: 'cascade' }),
    value: varchar('value', { length: 128 }).notNull(),       // "빨강"
    position: integer('position').notNull().default(0),       // 값 순서
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('uq_mpov_group_value').on(t.groupId, t.value),
    unique('uq_mpov_group_position').on(t.groupId, t.position),
  ],
);

// ─── master_product_variant_option_values ────────────────────────
// variant ↔ optionValue 다대다 매핑.
// 한 variant 는 한 group 당 정확히 하나의 value 를 가져야 한다 (앱 레이어에서 검증).

export const masterProductVariantOptionValues = pgTable(
  'master_product_variant_option_values',
  {
    variantId: uuid('variant_id')
      .notNull()
      .references(() => masterProductVariants.id, { onDelete: 'cascade' }),
    optionValueId: uuid('option_value_id')
      .notNull()
      .references(() => masterProductOptionValues.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ name: 'pk_mpvov', columns: [t.variantId, t.optionValueId] }),
  ],
);

// ─── listed_products ─────────────────────────────────────────────
// 마스터 ↔ 채널 상품 간 연결(link) 정보만 저장. 채널 상품 본체는 항상 API 실시간 fetch.

export const listedProducts = pgTable('listed_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  masterProductId: uuid('master_product_id').notNull().references(() => masterProducts.id, { onDelete: 'cascade' }),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  channelItemId: varchar('channel_item_id', { length: 256 }).notNull(), // 채널 고유 상품 ID (Qoo10 ItemCode 등)
  linkedAt: timestamp('linked_at').notNull().defaultNow(),
  syncStatus: listedProductSyncStatusEnum('sync_status').notNull().default('SYNCED'),
  syncError: text('sync_error'),                                     // 마지막 동기화 실패 메시지
  lastSyncedAt: timestamp('last_synced_at'),
  channelData: jsonb('channel_data').default({}),                   // _salesPullBaselineAt, _lastSalesPullAt, _processedOrderIds
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── listed_product_variant_links ────────────────────────────────
// 마스터 variant ↔ 채널 옵션 매핑 테이블

export const listedProductVariantLinks = pgTable(
  'listed_product_variant_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listedProductId: uuid('listed_product_id').notNull().references(() => listedProducts.id, { onDelete: 'cascade' }),
    masterVariantId: uuid('master_variant_id').notNull().references(() => masterProductVariants.id, { onDelete: 'cascade' }),
    channelVariantId: varchar('channel_variant_id', { length: 256 }).notNull(), // 채널 옵션 고유 ID
    channelSellerCode: varchar('channel_seller_code', { length: 256 }), // 매핑 당시 SellerCode (표시용)
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    unique('uq_lpvl_listed_master').on(t.listedProductId, t.masterVariantId),
    unique('uq_lpvl_listed_channel').on(t.listedProductId, t.channelVariantId),
  ],
);

// ─── listed_product_skus ─────────────────────────────────────────
// 채널 옵션(channelVariantId) ↔ SKU 직접 매핑. 기존 listed_product_variant_links 를 대체.
// 마스터 variant 경유 없이 채널 ↔ SKU 로 연결되어, 동일 SKU가 여러 마스터에 속하더라도 채널 push 가 깨지지 않는다.

export const listedProductSkus = pgTable(
  'listed_product_skus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listedProductId: uuid('listed_product_id')
      .notNull()
      .references(() => listedProducts.id, { onDelete: 'cascade' }),
    channelVariantId: varchar('channel_variant_id', { length: 256 }).notNull(),
    channelSellerCode: varchar('channel_seller_code', { length: 256 }),
    skuId: uuid('sku_id').notNull().references(() => skus.id, { onDelete: 'restrict' }),
    qty: integer('qty').notNull().default(1),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    unique('uq_lps_listed_channel_sku').on(t.listedProductId, t.channelVariantId, t.skuId),
  ],
);

// ─── master_stock_ledger ─────────────────────────────────────────

export const masterStockLedgerTypeEnum = pgEnum('master_stock_ledger_type', [
  'SALE',          // 채널 주문으로 인한 차감
  'MANUAL_ADJUST', // 사용자가 수동으로 재고 변경
  'SYNC_RESET',    // 마스터 → 채널 push (재고 초기화 기준점)
]);

export const masterStockLedgerRefTypeEnum = pgEnum('master_stock_ledger_ref_type', [
  'ORDER',
  'USER',
  'SYNC',
]);

export const masterStockLedger = pgTable('master_stock_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => masterProductVariants.id, { onDelete: 'cascade' }),
  type: masterStockLedgerTypeEnum('type').notNull(),
  qtyDelta: integer('qty_delta').notNull(),                              // 음수=차감, 양수=증가/초기화
  prevStock: integer('prev_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  refType: masterStockLedgerRefTypeEnum('ref_type').notNull(),
  refId: varchar('ref_id', { length: 256 }),                             // ORDER: 채널 주문 ID, USER: userId, SYNC: listedProductId
  channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'set null' }),
  listedProductId: uuid('listed_product_id').references(() => listedProducts.id, { onDelete: 'set null' }),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── claims ─────────────────────────────────────────────────────

// ─── WMS 테이블 ──────────────────────────────────────────────────

export const wmsVendorEnum = pgEnum('wms_vendor', [
  'self',
  'cj_logistics',
  'hanjin',
  'sftp_batch',
  'custom',
]);

export const wmsStatusEnum = pgEnum('wms_status', ['ACTIVE', 'INACTIVE', 'PENDING']);

export const inboundStatusEnum = pgEnum('inbound_status', [
  'pending_dispatch',
  'instructed',
  'received',
  'canceled',
]);

export const movementTypeEnum = pgEnum('movement_type', [
  'inbound',
  'outbound',
  'transfer',
  'adjustment',
]);

export const movementStatusEnum = pgEnum('movement_status', [
  'applied',
  'pending_external',
  'failed',
]);

export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  vendor: wmsVendorEnum('vendor').notNull(),
  syncMode: varchar('sync_mode', { length: 32 }).notNull().default('manual'),
  status: wmsStatusEnum('status').notNull().default('PENDING'),
  capabilitiesJson: jsonb('capabilities_json').default({}),
  configJson: jsonb('config_json').default({}),          // endpoint, apiKey (encrypted), etc.
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const warehouseLocations = pgTable('warehouse_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  level: integer('level').notNull().default(1),
  fullPath: varchar('full_path', { length: 512 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const warehouseStocks = pgTable('warehouse_stocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  masterProductId: uuid('master_product_id').references(() => masterProducts.id, { onDelete: 'set null' }),
  masterVariantSku: varchar('master_variant_sku', { length: 128 }).notNull(),
  vendorSku: varchar('vendor_sku', { length: 128 }),     // WMS 벤더측 SKU (매핑 테이블)
  locationId: uuid('location_id').references(() => warehouseLocations.id, { onDelete: 'set null' }),
  lotCode: varchar('lot_code', { length: 128 }),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  sourceVendor: wmsVendorEnum('source_vendor').notNull(),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
  freshness: varchar('freshness', { length: 16 }).notNull().default('unknown'),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const inboundOrders = pgTable('inbound_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  status: inboundStatusEnum('status').notNull().default('pending_dispatch'),
  vendorRef: varchar('vendor_ref', { length: 256 }),
  expectedAt: timestamp('expected_at'),
  itemsJson: jsonb('items_json').default([]),             // InboundItem[]
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  type: movementTypeEnum('type').notNull(),
  status: movementStatusEnum('status').notNull().default('applied'),
  vendorRef: varchar('vendor_ref', { length: 256 }),
  reasonCode: varchar('reason_code', { length: 64 }),
  payloadJson: jsonb('payload_json').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// [[standard-order-v2]] §13 + [[CONVERT_RULES]] §5 — claims 상세 (Cancel/Return/Exchange/Swap).
// orders 의 claimType/claimStatus 는 요약, 본 테이블이 신뢰원.
export const claims = pgTable(
  'claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').notNull().references(() => channels.id),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }),
    orderNo: text('order_no').notNull(),                              // channelOrderId 캐시
    claimType: claimTypeEnum('claim_type').notNull(),
    claimStatus: claimStatusEnum('claim_status').notNull(),
    reason: text('reason'),
    requestDate: timestamp('request_date'),
    completeDate: timestamp('complete_date'),
    cancelRefundDate: timestamp('cancel_refund_date'),
    // 구매자 / 수취인 mirror (CONVERT_RULES §5)
    buyer: text('buyer'),
    buyerMobile: text('buyer_mobile'),
    receiver: text('receiver'),
    receiverMobile: text('receiver_mobile'),
    // 배송
    trackingNo: text('tracking_no'),
    deliveryCompany: text('delivery_company'),
    trackingNoReturn: text('tracking_no_return'),
    deliveryCompanyReturn: text('delivery_company_return'),
    // ── 배송사고 축 (claim 처리흐름과 직교) — Qoo10 14/15 미수취 → undelivered ──
    // incidentType: null | 'undelivered' | 'damaged' | 'lost' | 'misdelivered'
    incidentType: text('incident_type'),
    // incidentSource: null | 'buyer_report' | 'channel_flag' | 'operator'
    incidentSource: text('incident_source'),
    // 회수 생략 여부 (Qoo10 NC=No Collect 등) — undelivered 일 때만 의미
    incidentSkipCollection: boolean('incident_skip_collection').notNull().default(false),
    rawData: jsonb('raw_data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_claims_order_no').on(t.orderNo),
    index('idx_claims_channel_status').on(t.channelId, t.claimStatus),
  ],
);

// ============================================================================
// Rule Engine 메타 테이블 — [[decisions]] A-10, [[standard-order-v2]] §10
// ============================================================================

export const giftConditionTypeEnum = pgEnum('gift_condition_type', [
  'sku',
  'category',
  'amount',
  'qty',
  'all',
]);

// PlayAuto 2.0 사은품 분배 방식
// auto: 출고지시 전환 시 자동 평가/적용
// manual: 수동 분배 (선택 주문 일괄 적용)
export const giftDistributionModeEnum = pgEnum('gift_distribution_mode', [
  'auto',
  'manual',
]);

// 12통화 지원 (PlayAuto 2.0 사은품규칙 통화 옵션)
export const giftCurrencyEnum = pgEnum('gift_currency', [
  'KRW',
  'JPY',
  'USD',
  'EUR',
  'GBP',
  'CNY',
  'TWD',
  'HKD',
  'SGD',
  'AUD',
  'CAD',
  'THB',
]);

export const nameRuleScopeEnum = pgEnum('name_rule_scope', [
  'item_title',
  'option_name',
  'both',
]);

// match_rules — 채널 라인 → SKU 결정론적 매칭 ([[decisions]] A-10)
// 우선순위: (channelId, channelItemCode, optionCode) → fallback (channelId, channelItemCode, optionName)
export const matchRules = pgTable(
  'match_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    // ── IF (조건부) ─────────────────────────────────────────────
    // PlayAuto 2.0 키 조합: 쇼핑몰 + 쇼핑몰상품코드 + 쇼핑몰 상품명 + 주문 옵션선택명 (+ 옵션코드 보조)
    channelItemCode: text('channel_item_code').notNull(),
    channelItemTitle: text('channel_item_title').notNull().default(''),  // 쇼핑몰 상품명
    optionCode: text('option_code'),                                      // 보조 식별자(판매자관리코드)
    optionName: text('option_name'),                                      // 주문 옵션선택명
    // ── THEN (액션부) ───────────────────────────────────────────
    skuId: uuid('sku_id')
      .notNull()
      .references(() => skus.id, { onDelete: 'cascade' }),
    outputQty: integer('output_qty').notNull().default(1),                // 출고수량
    warehouseId: uuid('warehouse_id').references(() => warehouses.id, { onDelete: 'set null' }),
    // ── 메타 ───────────────────────────────────────────────────
    priority: smallint('priority').notNull().default(100),
    isActive: boolean('is_active').notNull().default(true),
    activeFrom: timestamp('active_from'),
    activeTo: timestamp('active_to'),
    note: text('note'),
    autoLearned: boolean('auto_learned').notNull().default(false),        // 자동 학습으로 생성
    lastMatchedAt: timestamp('last_matched_at'),                          // 마지막 적중 시각
    matchHitCount: integer('match_hit_count').notNull().default(0),       // 누적 적중 수
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('uq_match_rules_if').on(
      t.userId,
      t.channelId,
      t.channelItemCode,
      t.channelItemTitle,
      t.optionName,
    ),
    index('idx_match_rules_channel_item_code').on(t.channelId, t.channelItemCode, t.optionCode),
    index('idx_match_rules_channel_item_name').on(t.channelId, t.channelItemCode, t.optionName),
    index('idx_match_rules_sku').on(t.skuId),
  ],
);

// gift_rules — 사은품 자동 추가 룰 (PlayAuto 2.0 사은품규칙 4블록 스펙)
//   블록1 (기본설정): name, distributionMode, priority, isActive, activeFrom/To, channelFilter
//   블록2 (조건):     conditionType, conditionCurrency, conditionMinAmount, conditionMinQty, conditionPayload
//   블록3 (선택상품): conditionPayload.skuIds / categoryIds (조건 부속)
//   블록4 (분배+사은품): giftSkuId, giftQty, maxApplyCount
export const giftRules = pgTable(
  'gift_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // ── 블록1 ───────────────────────────────────────────────────
    distributionMode: giftDistributionModeEnum('distribution_mode').notNull().default('auto'),
    channelFilter: jsonb('channel_filter'),       // null=전체, { channelIds: string[] }
    // ── 블록2/3 ─────────────────────────────────────────────────
    conditionType: giftConditionTypeEnum('condition_type').notNull(),
    conditionCurrency: giftCurrencyEnum('condition_currency'),                   // amount 조건일 때만
    conditionMinAmount: numeric('condition_min_amount', { precision: 14, scale: 2 }),
    conditionMinQty: integer('condition_min_qty'),
    conditionPayload: jsonb('condition_payload').notNull().default({}),          // { skuIds?, categoryIds? }
    // ── 블록4 ───────────────────────────────────────────────────
    giftSkuId: uuid('gift_sku_id')
      .notNull()
      .references(() => skus.id, { onDelete: 'cascade' }),
    giftQty: integer('gift_qty').notNull().default(1),
    maxApplyCount: integer('max_apply_count'),     // null=무제한, 누적 적용 한도
    appliedCount: integer('applied_count').notNull().default(0),
    // ── 메타 ───────────────────────────────────────────────────
    priority: smallint('priority').notNull().default(100),
    isActive: boolean('is_active').notNull().default(true),
    activeFrom: timestamp('active_from'),
    activeTo: timestamp('active_to'),
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_gift_rules_user_active').on(t.userId, t.isActive),
    index('idx_gift_rules_gift_sku').on(t.giftSkuId),
    index('idx_gift_rules_distribution').on(t.userId, t.distributionMode, t.isActive),
  ],
);

// name_rules — 상품명/옵션명 정규화
export const nameRules = pgTable(
  'name_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'cascade' }),
    pattern: text('pattern').notNull(),
    replacement: text('replacement').notNull().default(''),
    scope: nameRuleScopeEnum('scope').notNull().default('both'),
    isRegex: boolean('is_regex').notNull().default(false),
    priority: smallint('priority').notNull().default(100),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_name_rules_user_active').on(t.userId, t.isActive),
    index('idx_name_rules_channel').on(t.channelId),
  ],
);

// channel_capabilities — 채널별 기능 플래그 (G-Q6 미결, 우선 nullable)
export const channelCapabilities = pgTable(
  'channel_capabilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id')
      .notNull()
      .unique()
      .references(() => channels.id, { onDelete: 'cascade' }),
    supportsTracking: boolean('supports_tracking'),
    supportsDispatchDelay: boolean('supports_dispatch_delay'),
    supportsBundleNumberInPush: boolean('supports_bundle_number_in_push'),
    supportsPartialShipment: boolean('supports_partial_shipment'),
    supportsCancel: boolean('supports_cancel'),
    supportsReturn: boolean('supports_return'),
    supportsExchange: boolean('supports_exchange'),
    supportsSwap: boolean('supports_swap'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
);

// status_rule_overrides — 채널별 status → fulfillment rank 매핑 예외
// 기본 매핑은 코드 상수(StatusRuleEngine) 우선, 본 테이블은 사용자 정의 override 만 저장.
export const statusRuleOverrides = pgTable(
  'status_rule_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    channelStatus: text('channel_status').notNull(),
    fulfillmentRank: smallint('fulfillment_rank').notNull(),
    claimStatus: claimStatusEnum('claim_status'),
    priority: smallint('priority').notNull().default(100),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_status_rule_overrides_channel_status').on(t.channelId, t.channelStatus),
  ],
);

// ─── user_settings ──────────────────────────────────────────────
// 사용자별 환경설정. settings 컬럼은 영역(orders, sync 등)별로 jsonb 객체 보관.
// orders: { lookbackDays, autoMatchSku, dispatchDelayThresholdDays, bundleKey: string[] }

export const DEFAULT_USER_ORDER_SETTINGS = {
  lookbackDays: 30,
  autoMatchSku: true,
  dispatchDelayThresholdDays: 3,
  bundleKey: ['receiverName', 'receiverTel', 'zipCode'] as string[],
} as const;

export type UserOrderSettings = {
  lookbackDays: number;
  autoMatchSku: boolean;
  dispatchDelayThresholdDays: number;
  bundleKey: string[];
};

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  orders: jsonb('orders').$type<UserOrderSettings>().notNull().default(DEFAULT_USER_ORDER_SETTINGS),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── notification_events ────────────────────────────────────────
// SMS/카카오 알림 전송 이력. INotificationAdapter 호출 결과를 저장.

export const notificationChannelEnum = pgEnum('notification_channel', ['sms', 'kakao']);
export const notificationResultEnum = pgEnum('notification_result', ['ok', 'warn', 'error']);

export const notificationEvents = pgTable(
  'notification_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    channel: notificationChannelEnum('channel').notNull(),
    template: text('template').notNull(),
    recipient: text('recipient').notNull(),
    payload: jsonb('payload').notNull().default({}),
    result: notificationResultEnum('result').notNull(),
    errorMessage: text('error_message'),
    vendorMessageId: text('vendor_message_id'),
    renderedBody: text('rendered_body'),
    sentAt: timestamp('sent_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    orderSentIdx: index('notification_events_order_sent_idx').on(table.orderId, table.sentAt),
  }),
);

