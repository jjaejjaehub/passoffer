CREATE TYPE "public"."master_stock_ledger_scope" AS ENUM('MASTER', 'WAREHOUSE');--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ALTER COLUMN "variant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ALTER COLUMN "ref_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD COLUMN "scope" "master_stock_ledger_scope";--> statement-breakpoint
UPDATE "master_stock_ledger" SET "scope" = 'MASTER' WHERE "scope" IS NULL;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ALTER COLUMN "scope" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD COLUMN "warehouse_id" uuid;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD CONSTRAINT "master_stock_ledger_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_stock_ledger" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "master_stock_ledger" ADD CONSTRAINT "uq_master_stock_ledger_ref" UNIQUE("ref_type","ref_id","scope","warehouse_id");--> statement-breakpoint
ALTER TABLE "public"."master_stock_ledger" ALTER COLUMN "ref_type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "master_stock_ledger" SET "ref_type" = 'MANUAL_ADJUST' WHERE "ref_type" IN ('ORDER', 'USER', 'SYNC');--> statement-breakpoint
DROP TYPE "public"."master_stock_ledger_ref_type";--> statement-breakpoint
CREATE TYPE "public"."master_stock_ledger_ref_type" AS ENUM('ORDER_RESERVE', 'ORDER_CANCEL', 'WAREHOUSE_PICK', 'WAREHOUSE_RESTOCK', 'WAREHOUSE_INBOUND', 'WAREHOUSE_OUTBOUND', 'MANUAL_ADJUST', 'SYNC_RESET', 'OVERSELL', 'UNMATCHED_SKU');--> statement-breakpoint
ALTER TABLE "public"."master_stock_ledger" ALTER COLUMN "ref_type" SET DATA TYPE "public"."master_stock_ledger_ref_type" USING "ref_type"::"public"."master_stock_ledger_ref_type";--> statement-breakpoint
DROP TYPE "public"."master_stock_ledger_type";