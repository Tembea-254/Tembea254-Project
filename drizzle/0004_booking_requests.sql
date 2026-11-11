CREATE TABLE "booking_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"user_id" text,
	"partner_id" text NOT NULL,
	"offer_id" text,
	"title" text NOT NULL,
	"kind" text DEFAULT 'package' NOT NULL,
	"place_id" text,
	"trip_id" text,
	"start_date" text NOT NULL,
	"end_date" text,
	"people" integer DEFAULT 1 NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"estimate_kes" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"booked_kes" integer,
	"commission_kes" integer,
	"partner_note" text,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partner_offers" ADD COLUMN "unit" text DEFAULT 'person' NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "owner_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_ref_idx" ON "booking_requests" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "bookings_partner_idx" ON "booking_requests" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "booking_requests" USING btree ("user_id");