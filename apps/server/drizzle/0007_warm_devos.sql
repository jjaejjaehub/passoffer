ALTER TABLE "match_rules" ADD COLUMN "channel_item_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "match_rules" ADD COLUMN "output_qty" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_rules" ADD COLUMN "warehouse_id" uuid;--> statement-breakpoint
ALTER TABLE "match_rules" ADD COLUMN "auto_learned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "match_rules" ADD COLUMN "last_matched_at" timestamp;--> statement-breakpoint
ALTER TABLE "match_rules" ADD COLUMN "match_hit_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_rules" ADD CONSTRAINT "match_rules_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_rules" ADD CONSTRAINT "uq_match_rules_if" UNIQUE("user_id","channel_id","channel_item_code","channel_item_title","option_name");