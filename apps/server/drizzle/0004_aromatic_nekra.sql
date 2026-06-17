CREATE TYPE "public"."claim_status" AS ENUM('cancel_requested', 'cancel_done', 'return_requested', 'return_in_progress', 'return_collected', 'return_done', 'exchange_requested', 'exchange_in_progress', 'exchange_collected', 'exchange_done', 'swap_requested', 'swap_done', 'requires_recheck');--> statement-breakpoint
CREATE TYPE "public"."claim_type" AS ENUM('cancel', 'return', 'exchange', 'swap');--> statement-breakpoint
CREATE TYPE "public"."gift_condition_type" AS ENUM('sku', 'category', 'amount');--> statement-breakpoint
CREATE TYPE "public"."listed_product_sync_status" AS ENUM('PENDING', 'SYNCED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."master_stock_ledger_type" AS ENUM('SALE', 'MANUAL_ADJUST', 'SYNC_RESET');--> statement-breakpoint
CREATE TYPE "public"."name_rule_scope" AS ENUM('item_title', 'option_name', 'both');--> statement-breakpoint
CREATE TYPE "public"."order_actor" AS ENUM('channel', 'user', 'system');--> statement-breakpoint
CREATE TYPE "public"."order_matched_by" AS ENUM('auto', 'manual', 'rule');--> statement-breakpoint
CREATE TABLE "channel_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"supports_tracking" boolean,
	"supports_dispatch_delay" boolean,
	"supports_bundle_number_in_push" boolean,
	"supports_partial_shipment" boolean,
	"supports_cancel" boolean,
	"supports_return" boolean,
	"supports_exchange" boolean,
	"supports_swap" boolean,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channel_capabilities_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE "gift_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"condition_type" "gift_condition_type" NOT NULL,
	"condition_payload" jsonb NOT NULL,
	"gift_sku_id" uuid NOT NULL,
	"gift_qty" integer DEFAULT 1 NOT NULL,
	"priority" smallint DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"active_from" timestamp,
	"active_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listed_product_skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listed_product_id" uuid NOT NULL,
	"channel_variant_id" varchar(256) NOT NULL,
	"channel_seller_code" varchar(256),
	"sku_id" uuid NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_lps_listed_channel_sku" UNIQUE("listed_product_id","channel_variant_id","sku_id")
);
--> statement-breakpoint
CREATE TABLE "master_variant_skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_variant_id" uuid NOT NULL,
	"sku_id" uuid NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mvs_variant_sku" UNIQUE("master_variant_id","sku_id")
);
--> statement-breakpoint
CREATE TABLE "match_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"channel_item_code" text NOT NULL,
	"option_code" text,
	"option_name" text,
	"sku_id" uuid NOT NULL,
	"priority" smallint DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"active_from" timestamp,
	"active_to" timestamp,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "name_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_id" uuid,
	"pattern" text NOT NULL,
	"replacement" text DEFAULT '' NOT NULL,
	"scope" "name_rule_scope" DEFAULT 'both' NOT NULL,
	"is_regex" boolean DEFAULT false NOT NULL,
	"priority" smallint DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_fulfillment" smallint,
	"to_fulfillment" smallint,
	"from_claim" "claim_status",
	"to_claim" "claim_status",
	"actor" "order_actor" NOT NULL,
	"actor_id" text,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(128) NOT NULL,
	"name" varchar(255),
	"stock" integer DEFAULT 0 NOT NULL,
	"barcode" varchar(64),
	"attributes" jsonb DEFAULT '{}'::jsonb,
	"warehouse_text" varchar(255),
	"is_primary_warehouse" boolean DEFAULT false NOT NULL,
	"vendor_text" varchar(255),
	"lead_time_days" integer,
	"safety_stock" integer DEFAULT 0 NOT NULL,
	"model_name" varchar(255),
	"inventory_code" varchar(128),
	"image" text,
	"standard_code" varchar(64),
	"hs_code" varchar(32),
	"isbn" varchar(13),
	"is_bundlable" boolean DEFAULT true NOT NULL,
	"width_cm" numeric(10, 2),
	"height_cm" numeric(10, 2),
	"depth_cm" numeric(10, 2),
	"weight_kg" numeric(10, 3),
	"inbound_unit" numeric(10, 2),
	"inbound_unit_type" varchar(16) DEFAULT 'EA',
	"purchase_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"purchase_freight" numeric(12, 2) DEFAULT '0' NOT NULL,
	"delivery_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ad_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"etc_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"supply_price" numeric(12, 2),
	"sale_price" numeric(12, 2),
	"currency" varchar(8) DEFAULT 'KRW' NOT NULL,
	"origin_country" varchar(64),
	"origin_extras" jsonb DEFAULT '[]'::jsonb,
	"requires_caution" boolean DEFAULT false NOT NULL,
	"tax_type" varchar(16) DEFAULT 'GENERAL' NOT NULL,
	"brand" varchar(128),
	"manufacturer" varchar(128),
	"manufacturer_en" varchar(40),
	"age_group" varchar(32),
	"info_notice" jsonb DEFAULT '{}'::jsonb,
	"main_image" text,
	"description_html" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_skus_user_code" UNIQUE("user_id","code")
);
--> statement-breakpoint
CREATE TABLE "status_rule_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"channel_status" text NOT NULL,
	"fulfillment_rank" smallint NOT NULL,
	"claim_status" "claim_status",
	"priority" smallint DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "master_channel_overrides" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "master_channel_overrides" CASCADE;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" DROP CONSTRAINT "uq_master_stock_ledger_ref";--> statement-breakpoint
ALTER TABLE "master_stock_ledger" DROP CONSTRAINT "master_stock_ledger_warehouse_id_warehouses_id_fk";
--> statement-breakpoint
ALTER TABLE "claims" ALTER COLUMN "claim_status" SET DATA TYPE claim_status USING "claim_status"::claim_status;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ALTER COLUMN "variant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ALTER COLUMN "ref_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "claim_type" "claim_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "complete_date" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "incident_type" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "incident_source" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "incident_skip_collection" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "raw_data" jsonb;--> statement-breakpoint
ALTER TABLE "listed_products" ADD COLUMN "sync_status" "listed_product_sync_status" DEFAULT 'SYNCED' NOT NULL;--> statement-breakpoint
ALTER TABLE "listed_products" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "listed_products" ADD COLUMN "last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD COLUMN "type" "master_stock_ledger_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "line_no" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "channel_item_code" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "channel_item_title" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "channel_option" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "channel_option_code" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "order_qty" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "sku_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "sku_code" varchar(128);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "sku_name" varchar(255);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "output_qty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "applied_gifts" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "warehouse_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "channel_pack_no" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "channel_item_no" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "channel_account_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "related_orders" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_tel" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_mobile" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_language" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receiver_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receiver_kana" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receiver_tel" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receiver_mobile" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receiver_email" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "address1" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "address2" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receiver_country" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "desired_delivery_date" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sender_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sender_tel" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sender_nation" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sender_zip_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sender_address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cart_discount_seller" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cart_discount_channel" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_way" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_message" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_rate" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_rate_type" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_due_date" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipped_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_carrier" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_no" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_conflict" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_conflict_payload" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_status" smallint DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claim_status" "claim_status";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "display_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_dispatch_delayed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "dispatch_hold_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sync_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "hold_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "held_from_status" smallint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claim_type" "claim_type";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claim_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claim_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claim_resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "return_tracking_no" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bundle_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bundleable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bundle_role_is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "auto_matched" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "matched_by" "order_matched_by";--> statement-breakpoint
ALTER TABLE "channel_capabilities" ADD CONSTRAINT "channel_capabilities_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_rules" ADD CONSTRAINT "gift_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_rules" ADD CONSTRAINT "gift_rules_gift_sku_id_skus_id_fk" FOREIGN KEY ("gift_sku_id") REFERENCES "public"."skus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listed_product_skus" ADD CONSTRAINT "listed_product_skus_listed_product_id_listed_products_id_fk" FOREIGN KEY ("listed_product_id") REFERENCES "public"."listed_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listed_product_skus" ADD CONSTRAINT "listed_product_skus_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_variant_skus" ADD CONSTRAINT "master_variant_skus_master_variant_id_master_product_variants_id_fk" FOREIGN KEY ("master_variant_id") REFERENCES "public"."master_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_variant_skus" ADD CONSTRAINT "master_variant_skus_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_rules" ADD CONSTRAINT "match_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_rules" ADD CONSTRAINT "match_rules_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_rules" ADD CONSTRAINT "match_rules_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "name_rules" ADD CONSTRAINT "name_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "name_rules" ADD CONSTRAINT "name_rules_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skus" ADD CONSTRAINT "skus_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_rule_overrides" ADD CONSTRAINT "status_rule_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_rule_overrides" ADD CONSTRAINT "status_rule_overrides_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gift_rules_user_active" ON "gift_rules" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_gift_rules_gift_sku" ON "gift_rules" USING btree ("gift_sku_id");--> statement-breakpoint
CREATE INDEX "idx_match_rules_channel_item_code" ON "match_rules" USING btree ("channel_id","channel_item_code","option_code");--> statement-breakpoint
CREATE INDEX "idx_match_rules_channel_item_name" ON "match_rules" USING btree ("channel_id","channel_item_code","option_name");--> statement-breakpoint
CREATE INDEX "idx_match_rules_sku" ON "match_rules" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "idx_name_rules_user_active" ON "name_rules" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_name_rules_channel" ON "name_rules" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_status_rule_overrides_channel_status" ON "status_rule_overrides" USING btree ("channel_id","channel_status");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_claims_order_no" ON "claims" USING btree ("order_no");--> statement-breakpoint
CREATE INDEX "idx_claims_channel_status" ON "claims" USING btree ("channel_id","claim_status");--> statement-breakpoint
CREATE INDEX "idx_orders_fulfillment_status" ON "orders" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "idx_orders_bundle_number" ON "orders" USING btree ("bundle_number");--> statement-breakpoint
CREATE INDEX "idx_orders_ordered_at" ON "orders" USING btree ("ordered_at");--> statement-breakpoint
CREATE INDEX "idx_orders_claim_status" ON "orders" USING btree ("claim_status");--> statement-breakpoint
CREATE INDEX "idx_orders_paid_at" ON "orders" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "idx_orders_channel_auto_matched" ON "orders" USING btree ("channel_id","auto_matched");--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN "description_html";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN "brand";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN "hs_code";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN "country_of_origin";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN "material";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN "weight_g";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN "retail_price";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN "images";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "master_stock_ledger" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "master_stock_ledger" DROP COLUMN "warehouse_id";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "product_name";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "option";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "sku";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "quantity";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "picked_quantity_by_warehouse";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "buyer_phone";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "receiver";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "total_amount";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "krw_amount";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "carrier_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "tracking_number";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "ship_date";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "uq_orders_channel_order" UNIQUE("channel_id","channel_order_id");--> statement-breakpoint
ALTER TABLE "public"."master_stock_ledger" ALTER COLUMN "ref_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."master_stock_ledger_ref_type";--> statement-breakpoint
CREATE TYPE "public"."master_stock_ledger_ref_type" AS ENUM('ORDER', 'USER', 'SYNC');--> statement-breakpoint
ALTER TABLE "public"."master_stock_ledger" ALTER COLUMN "ref_type" SET DATA TYPE "public"."master_stock_ledger_ref_type" USING "ref_type"::"public"."master_stock_ledger_ref_type";--> statement-breakpoint
DROP TYPE "public"."master_stock_ledger_scope";--> statement-breakpoint
DROP TYPE "public"."order_status";