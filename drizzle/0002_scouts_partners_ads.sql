CREATE TABLE "ads" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text,
	"headline" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"image" text,
	"cta" text DEFAULT 'Learn more' NOT NULL,
	"url" text NOT NULL,
	"placement" text DEFAULT 'all' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gig_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"gig_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'claimed' NOT NULL,
	"video_url" text,
	"duration_sec" integer,
	"in_app" boolean DEFAULT false NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"reviewer_note" text,
	"reviewed_by" text,
	"payout_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "gigs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'record' NOT NULL,
	"destination" text NOT NULL,
	"spot" text DEFAULT '' NOT NULL,
	"brief" text DEFAULT '' NOT NULL,
	"requirements" text[] DEFAULT '{}'::text[] NOT NULL,
	"min_minutes" integer DEFAULT 10 NOT NULL,
	"pay_kes" integer DEFAULT 0 NOT NULL,
	"reward_tokens" integer DEFAULT 0 NOT NULL,
	"slots" integer DEFAULT 1 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"deadline" timestamp with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"cover" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'operator' NOT NULL,
	"places" text[] DEFAULT '{}'::text[] NOT NULL,
	"days" integer DEFAULT 1 NOT NULL,
	"tier" text DEFAULT 'mid' NOT NULL,
	"price_per_person" integer NOT NULL,
	"includes" text[] DEFAULT '{}'::text[] NOT NULL,
	"excludes" text[] DEFAULT '{}'::text[] NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"rating" real,
	"reviews" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'operator' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"logo" text,
	"blurb" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"sponsored" boolean DEFAULT false NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"commission" real DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scout_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"county" text DEFAULT '' NOT NULL,
	"device" text DEFAULT 'phone' NOT NULL,
	"areas" text[] DEFAULT '{}'::text[] NOT NULL,
	"agreed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
CREATE INDEX "claims_gig_idx" ON "gig_claims" USING btree ("gig_id");--> statement-breakpoint
CREATE INDEX "claims_user_idx" ON "gig_claims" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "gig_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gigs_status_idx" ON "gigs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "offers_partner_idx" ON "partner_offers" USING btree ("partner_id");