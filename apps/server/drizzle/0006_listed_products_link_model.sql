-- listed_products: link-only 모델로 재구성
-- 1. 기존 FK 제약 삭제 (master_product_id nullable → cascade notNull 변경)
ALTER TABLE "listed_products" DROP CONSTRAINT IF EXISTS "listed_products_master_product_id_master_products_id_fk";--> statement-breakpoint

-- 2. 기존 데이터 삭제 (Q5: clean slate)
DELETE FROM "listed_products";--> statement-breakpoint

-- 3. 컬럼 변경: channel_item_code → channel_item_id (rename + notNull)
ALTER TABLE "listed_products" RENAME COLUMN "channel_item_code" TO "channel_item_id";--> statement-breakpoint
ALTER TABLE "listed_products" ALTER COLUMN "channel_item_id" SET NOT NULL;--> statement-breakpoint

-- 4. master_product_id: nullable → notNull
ALTER TABLE "listed_products" ALTER COLUMN "master_product_id" SET NOT NULL;--> statement-breakpoint

-- 5. channel_id onDelete: cascade (already set)

-- 6. linked_at 컬럼 추가
ALTER TABLE "listed_products" ADD COLUMN "linked_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint

-- 7. 불필요 컬럼 삭제
ALTER TABLE "listed_products" DROP COLUMN IF EXISTS "channel_seller_code";--> statement-breakpoint
ALTER TABLE "listed_products" DROP COLUMN IF EXISTS "title";--> statement-breakpoint
ALTER TABLE "listed_products" DROP COLUMN IF EXISTS "status";--> statement-breakpoint
ALTER TABLE "listed_products" DROP COLUMN IF EXISTS "sync_status";--> statement-breakpoint
ALTER TABLE "listed_products" DROP COLUMN IF EXISTS "last_synced_at";--> statement-breakpoint

-- 8. sync_status enum 삭제
DROP TYPE IF EXISTS "public"."listed_product_sync_status";--> statement-breakpoint

-- 9. master_product_id FK 재생성 (onDelete cascade)
ALTER TABLE "listed_products" ADD CONSTRAINT "listed_products_master_product_id_master_products_id_fk" FOREIGN KEY ("master_product_id") REFERENCES "public"."master_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 10. listed_product_variant_links 테이블 생성
CREATE TABLE "listed_product_variant_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listed_product_id" uuid NOT NULL,
	"master_variant_id" uuid NOT NULL,
	"channel_variant_id" varchar(256) NOT NULL,
	"channel_seller_code" varchar(256),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_lpvl_listed_master" UNIQUE ("listed_product_id", "master_variant_id"),
	CONSTRAINT "uq_lpvl_listed_channel" UNIQUE ("listed_product_id", "channel_variant_id")
);--> statement-breakpoint
ALTER TABLE "listed_product_variant_links" ADD CONSTRAINT "listed_product_variant_links_listed_product_id_listed_products_id_fk" FOREIGN KEY ("listed_product_id") REFERENCES "public"."listed_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listed_product_variant_links" ADD CONSTRAINT "listed_product_variant_links_master_variant_id_master_product_variants_id_fk" FOREIGN KEY ("master_variant_id") REFERENCES "public"."master_product_variants"("id") ON DELETE cascade ON UPDATE no action;
