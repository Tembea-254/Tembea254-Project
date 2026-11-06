CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_email" text,
	"action" text NOT NULL,
	"target" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'Guides' NOT NULL,
	"cover" text DEFAULT '' NOT NULL,
	"author" text DEFAULT 'Tembea254 Team' NOT NULL,
	"read_mins" integer DEFAULT 4 NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related" jsonb,
	"status" text DEFAULT 'published' NOT NULL,
	"published_at" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hires" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"start" text NOT NULL,
	"units" integer NOT NULL,
	"people" integer NOT NULL,
	"pickup" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"phone" text NOT NULL,
	"total" integer NOT NULL,
	"deposit" integer NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"payment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"host_user_id" text NOT NULL,
	"title" text NOT NULL,
	"destination" text NOT NULL,
	"mode" text DEFAULT 'walk' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 30 NOT NULL,
	"stream_url" text,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"reward_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"title" text NOT NULL,
	"image" text,
	"price" integer NOT NULL,
	"qty" integer NOT NULL,
	"line_total" integer NOT NULL,
	"commission_rate" real NOT NULL,
	"commission" integer NOT NULL,
	"vendor_amount" integer NOT NULL,
	"fulfilment" text DEFAULT 'pending' NOT NULL,
	"tracking_note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"buyer_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"commission" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"payment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"purpose" text NOT NULL,
	"ref_id" text NOT NULL,
	"amount" integer NOT NULL,
	"method" text DEFAULT 'mpesa' NOT NULL,
	"phone" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"checkout_request_id" text,
	"receipt" text,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"payee_type" text NOT NULL,
	"amount" integer NOT NULL,
	"method" text DEFAULT 'mpesa' NOT NULL,
	"destination" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"reference" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "phrases" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text DEFAULT 'Basics' NOT NULL,
	"english" text NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "post_saves" (
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_saves_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text DEFAULT 'update' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"place_id" text,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rating" integer,
	"status" text DEFAULT 'visible' NOT NULL,
	"team" boolean DEFAULT false NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"compare_at" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"images" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"made_in" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"hub" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"base" text DEFAULT '' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"offer" text DEFAULT '' NOT NULL,
	"rate" integer NOT NULL,
	"unit" text NOT NULL,
	"terms" text DEFAULT '' NOT NULL,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"years" integer DEFAULT 0 NOT NULL,
	"specialties" text[] DEFAULT '{}'::text[] NOT NULL,
	"checks" text[] DEFAULT '{}'::text[] NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"from" text DEFAULT '' NOT NULL,
	"trip" text DEFAULT '' NOT NULL,
	"rating" integer NOT NULL,
	"text" text NOT NULL,
	"place_image" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rewarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"region" text DEFAULT 'All Kenya' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"ref_type" text,
	"ref_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"from_lang" text NOT NULL,
	"to_lang" text NOT NULL,
	"chars" integer DEFAULT 0 NOT NULL,
	"engine" text DEFAULT 'phrasebook' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"stops" text[] DEFAULT '{}'::text[] NOT NULL,
	"days" integer DEFAULT 0 NOT NULL,
	"travelers" integer DEFAULT 1 NOT NULL,
	"total_kes" integer DEFAULT 0 NOT NULL,
	"start_date" text,
	"source" text DEFAULT 'engine' NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"image" text,
	"phone" text,
	"password_hash" text,
	"provider" text DEFAULT 'email' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"credits" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"store_name" text NOT NULL,
	"slug" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logo" text,
	"banner" text,
	"location" text DEFAULT '' NOT NULL,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"phone" text NOT NULL,
	"payout_method" text DEFAULT 'mpesa' NOT NULL,
	"payout_account" text DEFAULT '' NOT NULL,
	"kyc" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"commission_rate" real,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "video_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"destination" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"mode" text NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"is_360" boolean DEFAULT false NOT NULL,
	"resolution" text DEFAULT '' NOT NULL,
	"duration_sec" integer,
	"asking_price" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"offer_amount" integer,
	"reward_tokens" integer DEFAULT 0 NOT NULL,
	"reviewer_note" text,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vr_destinations" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'Safari' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vr_scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"destination_slug" text NOT NULL,
	"mode" text NOT NULL,
	"title" text NOT NULL,
	"spot" text NOT NULL,
	"time" text DEFAULT 'day' NOT NULL,
	"source" jsonb NOT NULL,
	"minutes" integer DEFAULT 1 NOT NULL,
	"yaw" integer,
	"premium" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"credit" text DEFAULT '' NOT NULL,
	"submission_id" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "items_vendor_idx" ON "order_items" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_checkout_idx" ON "payments" USING btree ("checkout_request_id");--> statement-breakpoint
CREATE INDEX "posts_created_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_user_idx" ON "posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_vendor_idx" ON "products" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trips_user_idx" ON "trips" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_user_idx" ON "vendors" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_slug_idx" ON "vendors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "subs_user_idx" ON "video_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subs_status_idx" ON "video_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vr_scenes_dest_idx" ON "vr_scenes" USING btree ("destination_slug");