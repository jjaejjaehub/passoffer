CREATE TYPE "public"."master_stock_ledger_ref_type" AS ENUM('ORDER', 'USER', 'SYNC');--> statement-breakpoint
CREATE TYPE "public"."master_stock_ledger_type" AS ENUM('SALE', 'MANUAL_ADJUST', 'SYNC_RESET');--> statement-breakpoint
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
ALTER TABLE "order_items" ADD COLUMN "sku" varchar(128);--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD CONSTRAINT "master_stock_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD CONSTRAINT "master_stock_ledger_variant_id_master_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."master_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD CONSTRAINT "master_stock_ledger_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD CONSTRAINT "master_stock_ledger_listed_product_id_listed_products_id_fk" FOREIGN KEY ("listed_product_id") REFERENCES "public"."listed_products"("id") ON DELETE set null ON UPDATE no action;