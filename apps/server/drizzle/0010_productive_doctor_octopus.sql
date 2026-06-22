ALTER TABLE "orders" ADD COLUMN "duplicate_group_key" text;--> statement-breakpoint
CREATE INDEX "idx_orders_duplicate_group" ON "orders" USING btree ("duplicate_group_key");