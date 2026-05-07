CREATE TYPE "public"."channel_status" AS ENUM('ACTIVE', 'INACTIVE', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."channel_type" AS ENUM('QOO10_JP', 'SHOPEE', 'RAKUTEN', 'SHOPIFY', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."credential_type" AS ENUM('API_KEY', 'COOKIE', 'OAUTH');--> statement-breakpoint
CREATE TYPE "public"."inbound_status" AS ENUM('pending_dispatch', 'instructed', 'received', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."master_stock_ledger_ref_type" AS ENUM('ORDER', 'USER', 'SYNC');--> statement-breakpoint
CREATE TYPE "public"."master_stock_ledger_type" AS ENUM('SALE', 'MANUAL_ADJUST', 'SYNC_RESET');--> statement-breakpoint
CREATE TYPE "public"."movement_status" AS ENUM('applied', 'pending_external', 'failed');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('inbound', 'outbound', 'transfer', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'CLAIMED', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."wms_status" AS ENUM('ACTIVE', 'INACTIVE', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."wms_vendor" AS ENUM('self', 'cj_logistics', 'hanjin', 'sftp_batch', 'custom');--> statement-breakpoint
CREATE TABLE "channel_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"credential_type" "credential_type" NOT NULL,
	"encrypted_value" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"channel_type" "channel_type" NOT NULL,
	"name" text NOT NULL,
	"status" "channel_status" DEFAULT 'PENDING' NOT NULL,
	"adapter_version" text DEFAULT '1.0.0' NOT NULL,
	"mapping_schema" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"channel_id" uuid NOT NULL,
	"order_no" text NOT NULL,
	"claim_status" text NOT NULL,
	"reason" text,
	"request_date" timestamp,
	"cancel_refund_date" timestamp,
	"buyer" text,
	"buyer_mobile" text,
	"receiver" text,
	"receiver_mobile" text,
	"tracking_no" text,
	"delivery_company" text,
	"tracking_no_return" text,
	"delivery_company_return" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"status" "inbound_status" DEFAULT 'pending_dispatch' NOT NULL,
	"vendor_ref" varchar(256),
	"expected_at" timestamp,
	"items_json" jsonb DEFAULT '[]'::jsonb,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listed_product_variant_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listed_product_id" uuid NOT NULL,
	"master_variant_id" uuid NOT NULL,
	"channel_variant_id" varchar(256) NOT NULL,
	"channel_seller_code" varchar(256),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_lpvl_listed_master" UNIQUE("listed_product_id","master_variant_id"),
	CONSTRAINT "uq_lpvl_listed_channel" UNIQUE("listed_product_id","channel_variant_id")
);
--> statement-breakpoint
CREATE TABLE "listed_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"master_product_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"channel_item_id" varchar(256) NOT NULL,
	"linked_at" timestamp DEFAULT now() NOT NULL,
	"channel_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_product_option_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_product_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mpog_master_name" UNIQUE("master_product_id","name"),
	CONSTRAINT "uq_mpog_master_position" UNIQUE("master_product_id","position")
);
--> statement-breakpoint
CREATE TABLE "master_product_option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"value" varchar(128) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mpov_group_value" UNIQUE("group_id","value"),
	CONSTRAINT "uq_mpov_group_position" UNIQUE("group_id","position")
);
--> statement-breakpoint
CREATE TABLE "master_product_variant_option_values" (
	"variant_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	CONSTRAINT "pk_mpvov" PRIMARY KEY("variant_id","option_value_id")
);
--> statement-breakpoint
CREATE TABLE "master_product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_product_id" uuid NOT NULL,
	"sku" varchar(128) NOT NULL,
	"price" numeric(12, 2),
	"stock" integer DEFAULT 0 NOT NULL,
	"extra_attributes" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description_html" text,
	"brand" varchar(128),
	"hs_code" varchar(20),
	"country_of_origin" varchar(64),
	"material" varchar(256),
	"weight_g" integer,
	"retail_price" numeric(12, 2),
	"images" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"attributes" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_stock_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"type" "master_stock_ledger_type" NOT NULL,
	"qty_delta" integer NOT NULL,
	"prev_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"ref_type" "master_stock_ledger_ref_type" NOT NULL,
	"ref_id" varchar(256),
	"channel_id" uuid,
	"listed_product_id" uuid,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"option" text,
	"sku" varchar(128),
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2),
	"total_price" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"channel_id" uuid NOT NULL,
	"channel_order_id" text NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"ordered_at" timestamp NOT NULL,
	"buyer_name" text,
	"buyer_kana" text,
	"buyer_phone" text,
	"buyer_email" text,
	"receiver" text,
	"shipping_address" text,
	"zip_code" text,
	"currency" text DEFAULT 'JPY' NOT NULL,
	"total_amount" numeric(12, 2),
	"krw_amount" numeric(12, 2),
	"payment_method" text,
	"carrier_id" text,
	"tracking_number" text,
	"ship_date" timestamp,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"channel_id" uuid NOT NULL,
	"channel_item_code" text NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"title" text NOT NULL,
	"price" numeric(12, 2),
	"settle_price" numeric(12, 2),
	"retail_price" numeric(12, 2),
	"qty" integer DEFAULT 0,
	"category_main_code" text,
	"category_main_name" text,
	"category_sub1_code" text,
	"category_sub1_name" text,
	"category_sub2_code" text,
	"category_sub2_name" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"type" "movement_type" NOT NULL,
	"status" "movement_status" DEFAULT 'applied' NOT NULL,
	"vendor_ref" varchar(256),
	"reason_code" varchar(64),
	"payload_json" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "warehouse_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"parent_id" uuid,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"full_path" varchar(512) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_stocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"master_product_id" uuid,
	"master_variant_sku" varchar(128) NOT NULL,
	"vendor_sku" varchar(128),
	"location_id" uuid,
	"lot_code" varchar(128),
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"source_vendor" "wms_vendor" NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"freshness" varchar(16) DEFAULT 'unknown' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"vendor" "wms_vendor" NOT NULL,
	"sync_mode" varchar(32) DEFAULT 'manual' NOT NULL,
	"status" "wms_status" DEFAULT 'PENDING' NOT NULL,
	"capabilities_json" jsonb DEFAULT '{}'::jsonb,
	"config_json" jsonb DEFAULT '{}'::jsonb,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_credentials" ADD CONSTRAINT "channel_credentials_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_orders" ADD CONSTRAINT "inbound_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_orders" ADD CONSTRAINT "inbound_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listed_product_variant_links" ADD CONSTRAINT "listed_product_variant_links_listed_product_id_listed_products_id_fk" FOREIGN KEY ("listed_product_id") REFERENCES "public"."listed_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listed_product_variant_links" ADD CONSTRAINT "listed_product_variant_links_master_variant_id_master_product_variants_id_fk" FOREIGN KEY ("master_variant_id") REFERENCES "public"."master_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listed_products" ADD CONSTRAINT "listed_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listed_products" ADD CONSTRAINT "listed_products_master_product_id_master_products_id_fk" FOREIGN KEY ("master_product_id") REFERENCES "public"."master_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listed_products" ADD CONSTRAINT "listed_products_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_product_option_groups" ADD CONSTRAINT "master_product_option_groups_master_product_id_master_products_id_fk" FOREIGN KEY ("master_product_id") REFERENCES "public"."master_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_product_option_values" ADD CONSTRAINT "master_product_option_values_group_id_master_product_option_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."master_product_option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_product_variant_option_values" ADD CONSTRAINT "master_product_variant_option_values_variant_id_master_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."master_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_product_variant_option_values" ADD CONSTRAINT "master_product_variant_option_values_option_value_id_master_product_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."master_product_option_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_product_variants" ADD CONSTRAINT "master_product_variants_master_product_id_master_products_id_fk" FOREIGN KEY ("master_product_id") REFERENCES "public"."master_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_products" ADD CONSTRAINT "master_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD CONSTRAINT "master_stock_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD CONSTRAINT "master_stock_ledger_variant_id_master_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."master_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD CONSTRAINT "master_stock_ledger_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD CONSTRAINT "master_stock_ledger_listed_product_id_listed_products_id_fk" FOREIGN KEY ("listed_product_id") REFERENCES "public"."listed_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_master_product_id_master_products_id_fk" FOREIGN KEY ("master_product_id") REFERENCES "public"."master_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_location_id_warehouse_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;