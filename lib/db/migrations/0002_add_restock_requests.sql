-- 催补货请求：用于统计售罄商品的补货需求（社交证明 + 需求信号）
-- 注意：这里刻意做成“按用户去重”，避免计数被刷；真正的补货通知可在后续接入站内信/邮件等渠道

CREATE TABLE IF NOT EXISTS "restock_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"user_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "restock_requests"
	ADD CONSTRAINT "restock_requests_product_id_products_id_fk"
	FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
	ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "restock_requests_product_id_idx"
	ON "restock_requests" USING btree ("product_id");

CREATE INDEX IF NOT EXISTS "restock_requests_user_id_idx"
	ON "restock_requests" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "restock_requests_created_at_idx"
	ON "restock_requests" USING btree ("created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "restock_requests_product_user_idx"
	ON "restock_requests" USING btree ("product_id","user_id");
