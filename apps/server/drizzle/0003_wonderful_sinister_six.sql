CREATE TYPE "public"."listed_product_sync_status" AS ENUM('SYNCED', 'PENDING', 'FAILED');--> statement-breakpoint
CREATE TABLE "listed_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"master_product_id" uuid,
	"channel_id" uuid NOT NULL,
	"channel_item_code" varchar(256),
	"channel_seller_code" varchar(256),
	"title" varchar(512),
	"status" varchar(32),
	"sync_status" "listed_product_sync_status" DEFAULT 'PENDING' NOT NULL,
	"channel_data" jsonb DEFAULT '{}'::jsonb,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_product_id" uuid NOT NULL,
	"sku" varchar(128) NOT NULL,
	"option_name" varchar(128),
	"option_value" varchar(128),
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
ALTER TABLE "listed_products" ADD CONSTRAINT "listed_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listed_products" ADD CONSTRAINT "listed_products_master_product_id_master_products_id_fk" FOREIGN KEY ("master_product_id") REFERENCES "public"."master_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listed_products" ADD CONSTRAINT "listed_products_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_product_variants" ADD CONSTRAINT "master_product_variants_master_product_id_master_products_id_fk" FOREIGN KEY ("master_product_id") REFERENCES "public"."master_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_products" ADD CONSTRAINT "master_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;