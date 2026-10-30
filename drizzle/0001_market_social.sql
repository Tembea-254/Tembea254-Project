CREATE TABLE "follows" (
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text,
	"type" text NOT NULL,
	"text" text NOT NULL,
	"href" text DEFAULT '' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"user_id" text NOT NULL,
	"order_item_id" text,
	"rating" integer NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"images" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"status" text NOT NULL,
	"title" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"media" jsonb NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"place_id" text,
	"product_id" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist" (
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "kind" text DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "booking_date" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "booking_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "return_status" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "return_reason" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "reviewed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_method" text DEFAULT 'home' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_station" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "eta_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "eta_to" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "product_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "kind" text DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "service_type" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "hub" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit" text DEFAULT 'item' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fulfilled_by" text DEFAULT 'seller' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "languages" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rating_avg" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "seller_type" text DEFAULT 'maker' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "hub" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "rating_avg" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "strikes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "follows_following_idx" ON "follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "notif_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "prev_product_idx" ON "product_reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "prev_vendor_idx" ON "product_reviews" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "ship_order_idx" ON "shipment_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "stories_exp_idx" ON "stories" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_idx" ON "users" USING btree ("handle");