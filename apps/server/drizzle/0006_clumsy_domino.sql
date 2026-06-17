CREATE TYPE "public"."order_event_log_result" AS ENUM('ok', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."order_event_log_type" AS ENUM('auto_match_success', 'auto_match_failed', 'duplicate_suspect', 'status_sync', 'collect_error');--> statement-breakpoint
CREATE TABLE "order_event_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_id" uuid,
	"order_id" uuid,
	"order_item_id" uuid,
	"event_type" "order_event_log_type" NOT NULL,
	"result" "order_event_log_result" NOT NULL,
	"message" text,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_event_log" ADD CONSTRAINT "order_event_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event_log" ADD CONSTRAINT "order_event_log_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event_log" ADD CONSTRAINT "order_event_log_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event_log" ADD CONSTRAINT "order_event_log_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_order_event_log_user_created" ON "order_event_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_order_event_log_event_type" ON "order_event_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_order_event_log_channel" ON "order_event_log" USING btree ("channel_id");