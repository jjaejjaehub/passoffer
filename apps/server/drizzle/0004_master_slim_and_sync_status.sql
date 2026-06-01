CREATE TYPE "public"."listed_product_sync_status" AS ENUM('PENDING', 'SYNCED', 'ERROR');--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN IF EXISTS "description_html";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN IF EXISTS "brand";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN IF EXISTS "hs_code";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN IF EXISTS "country_of_origin";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN IF EXISTS "material";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN IF EXISTS "weight_g";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN IF EXISTS "retail_price";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN IF EXISTS "images";--> statement-breakpoint
ALTER TABLE "master_products" DROP COLUMN IF EXISTS "tags";--> statement-breakpoint
ALTER TABLE "listed_products" ADD COLUMN "sync_status" "listed_product_sync_status" DEFAULT 'SYNCED' NOT NULL;--> statement-breakpoint
ALTER TABLE "listed_products" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "listed_products" ADD COLUMN "last_synced_at" timestamp;
