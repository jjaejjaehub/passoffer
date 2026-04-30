CREATE TYPE "public"."channel_status" AS ENUM('ACTIVE', 'INACTIVE', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."channel_type" AS ENUM('QOO10_JP', 'SHOPEE', 'RAKUTEN', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."credential_type" AS ENUM('API_KEY', 'COOKIE', 'OAUTH');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'CLAIMED', 'RETURNED');--> statement-breakpoint
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
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"option" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2),
	"total_price" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
ALTER TABLE "channel_credentials" ADD CONSTRAINT "channel_credentials_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;