ALTER TYPE "public"."order_event_log_type" ADD VALUE 'rule_auto_learned';--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "matched_by" "order_matched_by";--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "match_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_match_rule_id_match_rules_id_fk" FOREIGN KEY ("match_rule_id") REFERENCES "public"."match_rules"("id") ON DELETE set null ON UPDATE no action;