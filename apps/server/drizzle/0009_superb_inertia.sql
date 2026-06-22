CREATE TYPE "public"."gift_currency" AS ENUM('KRW', 'JPY', 'USD', 'EUR', 'GBP', 'CNY', 'TWD', 'HKD', 'SGD', 'AUD', 'CAD', 'THB');--> statement-breakpoint
CREATE TYPE "public"."gift_distribution_mode" AS ENUM('auto', 'manual');--> statement-breakpoint
ALTER TYPE "public"."gift_condition_type" ADD VALUE 'qty';--> statement-breakpoint
ALTER TYPE "public"."gift_condition_type" ADD VALUE 'all';--> statement-breakpoint
ALTER TABLE "gift_rules" ALTER COLUMN "condition_payload" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "gift_rules" ADD COLUMN "distribution_mode" "gift_distribution_mode" DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_rules" ADD COLUMN "channel_filter" jsonb;--> statement-breakpoint
ALTER TABLE "gift_rules" ADD COLUMN "condition_currency" "gift_currency";--> statement-breakpoint
ALTER TABLE "gift_rules" ADD COLUMN "condition_min_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "gift_rules" ADD COLUMN "condition_min_qty" integer;--> statement-breakpoint
ALTER TABLE "gift_rules" ADD COLUMN "max_apply_count" integer;--> statement-breakpoint
ALTER TABLE "gift_rules" ADD COLUMN "applied_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_rules" ADD COLUMN "note" text;--> statement-breakpoint
CREATE INDEX "idx_gift_rules_distribution" ON "gift_rules" USING btree ("user_id","distribution_mode","is_active");