/**
 * Tembea254 database schema (Postgres, via Drizzle ORM).
 *
 * Money is stored as whole Kenyan shillings (integers). Tokens are Tembea reward points.
 * Change a table here, then run `npm run db:generate` to create a migration.
 */
import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey();
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export type Role = "user" | "admin";
export type UserStatus = "active" | "suspended";
export type UserPlan = "free" | "pro";

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    image: text("image"),
    phone: text("phone"),
    passwordHash: text("password_hash"),
    /** how they first signed up: email | google | facebook | demo */
    provider: text("provider").notNull().default("email"),
    role: text("role").$type<Role>().notNull().default("user"),
    status: text("status").$type<UserStatus>().notNull().default("active"),
    /** reward tokens (earned for approved reviews, creator work, live walks) */
    tokens: integer("tokens").notNull().default(0),
    /** AI planner / premium credits — for the upcoming paid plans */
    credits: integer("credits").notNull().default(5),
    /** subscription: free (ads every ~20 s) | pro (ads about once an hour, unlimited planner) */
    plan: text("plan").$type<UserPlan>().notNull().default("free"),
    /** public profile: @handle and a short bio (community) */
    handle: text("handle"),
    bio: text("bio").notNull().default(""),
    createdAt: created(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_handle_idx").on(t.handle)],
);

/* ------------------------------------------------------------------ */
/* Trip planner                                                        */
/* ------------------------------------------------------------------ */

export const trips = pgTable(
  "trips",
  {
    id: id(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    stops: text("stops").array().notNull().default(sql`'{}'::text[]`),
    days: integer("days").notNull().default(0),
    travelers: integer("travelers").notNull().default(1),
    totalKes: integer("total_kes").notNull().default(0),
    startDate: text("start_date"),
    source: text("source").notNull().default("engine"),
    /** the full itinerary as the planner stores it */
    data: jsonb("data").notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("trips_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Virtual pre-visits                                                  */
/* ------------------------------------------------------------------ */

export const vrDestinations = pgTable("vr_destinations", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull().default(""),
  type: text("type").notNull().default("Safari"),
  published: boolean("published").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  /** everything else about the destination (description, cover, highlights …) */
  data: jsonb("data").notNull(),
  updatedAt: updated(),
});

export const vrScenes = pgTable(
  "vr_scenes",
  {
    id: id(),
    destinationSlug: text("destination_slug").notNull(),
    mode: text("mode").notNull(), // fly | walk | drive | view
    title: text("title").notNull(),
    spot: text("spot").notNull(),
    time: text("time").notNull().default("day"),
    /** { kind: "youtube", id, start } | { kind: "video", src } | { kind: "photo", src } */
    source: jsonb("source").notNull(),
    minutes: integer("minutes").notNull().default(1),
    yaw: integer("yaw"),
    premium: boolean("premium").notNull().default(false),
    published: boolean("published").notNull().default(true),
    credit: text("credit").notNull().default(""),
    /** set when the scene came from a creator's purchased video */
    submissionId: text("submission_id"),
    sort: integer("sort").notNull().default(0),
    createdAt: created(),
  },
  (t) => [index("vr_scenes_dest_idx").on(t.destinationSlug)],
);

/* ------------------------------------------------------------------ */
/* Creator programme & live walks                                      */
/* ------------------------------------------------------------------ */

export type SubmissionStatus = "submitted" | "in_review" | "approved" | "purchased" | "rejected";

export const videoSubmissions = pgTable(
  "video_submissions",
  {
    id: id(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    destination: text("destination").notNull(), // vr destination slug or free text place
    location: text("location").notNull().default(""),
    mode: text("mode").notNull(), // fly | walk | drive | view | water
    videoUrl: text("video_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    is360: boolean("is_360").notNull().default(false),
    resolution: text("resolution").notNull().default(""),
    durationSec: integer("duration_sec"),
    askingPrice: integer("asking_price").notNull().default(0),
    status: text("status").$type<SubmissionStatus>().notNull().default("submitted"),
    offerAmount: integer("offer_amount"),
    rewardTokens: integer("reward_tokens").notNull().default(0),
    reviewerNote: text("reviewer_note"),
    reviewedBy: text("reviewed_by"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("subs_user_idx").on(t.userId), index("subs_status_idx").on(t.status)],
);

export type LiveStatus = "proposed" | "scheduled" | "live" | "ended" | "cancelled";

export const liveSessions = pgTable("live_sessions", {
  id: id(),
  hostUserId: text("host_user_id").notNull(),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  mode: text("mode").notNull().default("walk"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMin: integer("duration_min").notNull().default(30),
  streamUrl: text("stream_url"),
  notes: text("notes").notNull().default(""),
  status: text("status").$type<LiveStatus>().notNull().default("proposed"),
  rewardTokens: integer("reward_tokens").notNull().default(0),
  createdAt: created(),
});

/* ------------------------------------------------------------------ */
/* Tembea Scouts: paid recording jobs for young creators                */
/* ------------------------------------------------------------------ */

/** A scout's profile, filled in once during onboarding. */
export const scoutProfiles = pgTable("scout_profiles", {
  userId: text("user_id").primaryKey(),
  phone: text("phone").notNull(),
  county: text("county").notNull().default(""),
  device: text("device").notNull().default("phone"), // phone | 360 | drone | action
  /** where they can travel to film (county or place names) */
  areas: text("areas").array().notNull().default(sql`'{}'::text[]`),
  agreedAt: timestamp("agreed_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("active"), // active | paused | banned
  createdAt: created(),
});

export type GigKind = "record" | "record360" | "live" | "photos";
export type GigStatus = "open" | "paused" | "closed";

/** A paid job on the Scouts board: "Record 30 min of 360° at the Mara - earn KES 500". */
export const gigs = pgTable(
  "gigs",
  {
    id: id(),
    title: text("title").notNull(),
    kind: text("kind").$type<GigKind>().notNull().default("record"),
    /** VR destination slug or planner place id */
    destination: text("destination").notNull(),
    spot: text("spot").notNull().default(""),
    brief: text("brief").notNull().default(""),
    /** checklist the review is done against */
    requirements: text("requirements").array().notNull().default(sql`'{}'::text[]`),
    minMinutes: integer("min_minutes").notNull().default(10),
    payKes: integer("pay_kes").notNull().default(0),
    rewardTokens: integer("reward_tokens").notNull().default(0),
    /** how many scouts can be paid for it */
    slots: integer("slots").notNull().default(1),
    /** live gigs: when the session happens */
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    deadline: timestamp("deadline", { withTimezone: true }),
    status: text("status").$type<GigStatus>().notNull().default("open"),
    cover: text("cover"),
    createdBy: text("created_by"),
    createdAt: created(),
  },
  (t) => [index("gigs_status_idx").on(t.status)],
);

export type ClaimStatus = "claimed" | "submitted" | "approved" | "rejected" | "paid" | "dropped";

/** A scout taking a gig, then their submission and the review. */
export const gigClaims = pgTable(
  "gig_claims",
  {
    id: id(),
    gigId: text("gig_id").notNull(),
    userId: text("user_id").notNull(),
    status: text("status").$type<ClaimStatus>().notNull().default("claimed"),
    videoUrl: text("video_url"),
    durationSec: integer("duration_sec"),
    /** recorded in the app (true) or uploaded from the gallery */
    inApp: boolean("in_app").notNull().default(false),
    note: text("note").notNull().default(""),
    reviewerNote: text("reviewer_note"),
    reviewedBy: text("reviewed_by"),
    payoutId: text("payout_id"),
    claimedAt: created(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("claims_gig_idx").on(t.gigId), index("claims_user_idx").on(t.userId), index("claims_status_idx").on(t.status)],
);

/* ------------------------------------------------------------------ */
/* Partners: tour operators, stays and transport that list and advertise */
/* ------------------------------------------------------------------ */

export type PartnerKind = "operator" | "stay" | "transport";

export const partners = pgTable("partners", {
  id: id(),
  name: text("name").notNull(),
  kind: text("kind").$type<PartnerKind>().notNull().default("operator"),
  website: text("website").notNull().default(""),
  logo: text("logo"),
  blurb: text("blurb").notNull().default(""),
  phone: text("phone").notNull().default(""),
  /** paid placement: shown first in comparisons, always labelled "Sponsored" */
  sponsored: boolean("sponsored").notNull().default(false),
  /** sample data for demos: labelled "Sample listing" in the app */
  demo: boolean("demo").notNull().default(false),
  /** Tembea's referral commission on bookings, e.g. 0.08 */
  commission: real("commission").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});

/** A package, stay or transfer a partner sells. Prices are per person in KES. */
export const partnerOffers = pgTable(
  "partner_offers",
  {
    id: id(),
    partnerId: text("partner_id").notNull(),
    title: text("title").notNull(),
    kind: text("kind").$type<PartnerKind>().notNull().default("operator"),
    /** planner place ids the offer covers */
    places: text("places").array().notNull().default(sql`'{}'::text[]`),
    days: integer("days").notNull().default(1),
    tier: text("tier").notNull().default("mid"), // budget | mid | luxury
    pricePerPerson: integer("price_per_person").notNull(),
    includes: text("includes").array().notNull().default(sql`'{}'::text[]`),
    excludes: text("excludes").array().notNull().default(sql`'{}'::text[]`),
    url: text("url").notNull().default(""),
    rating: real("rating"),
    reviews: integer("reviews").notNull().default(0),
    active: boolean("active").notNull().default(true),
    clicks: integer("clicks").notNull().default(0),
    createdAt: created(),
  },
  (t) => [index("offers_partner_idx").on(t.partnerId)],
);

/** Sponsored creatives shown between screens. Free users see them every ~20 s, Pro about once an hour. */
export const ads = pgTable("ads", {
  id: id(),
  partnerId: text("partner_id"),
  headline: text("headline").notNull(),
  body: text("body").notNull().default(""),
  image: text("image"),
  cta: text("cta").notNull().default("Learn more"),
  url: text("url").notNull(),
  /** where it may show: all | planner | vr | translator | community | marketplace */
  placement: text("placement").notNull().default("all"),
  active: boolean("active").notNull().default(true),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: created(),
});

/** Live prices the AI found on operators' own sites, cached so each search is paid for once a day. */
export const liveCache = pgTable("live_cache", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every traveller Tembea254 sends to an operator's site: the B2B referral record partners are billed on. */
export const referrals = pgTable(
  "referrals",
  {
    id: id(),
    provider: text("provider").notNull(),
    url: text("url").notNull(),
    placeId: text("place_id"),
    kind: text("kind").notNull().default("package"),
    userId: text("user_id"),
    createdAt: created(),
  },
  (t) => [index("referrals_provider_idx").on(t.provider)],
);

/* ------------------------------------------------------------------ */
/* Community                                                           */
/* ------------------------------------------------------------------ */

export type Media = { type: "image" | "video"; url: string; poster?: string; width?: number; height?: number };
export type ContentStatus = "visible" | "hidden" | "removed";

export const posts = pgTable(
  "posts",
  {
    id: id(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull().default("update"), // update | tip | question | review
    text: text("text").notNull().default(""),
    placeId: text("place_id"),
    media: jsonb("media").$type<Media[]>().notNull().default(sql`'[]'::jsonb`),
    rating: integer("rating"),
    status: text("status").$type<ContentStatus>().notNull().default("visible"),
    team: boolean("team").notNull().default(false),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    /** hashtags without the # */
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** a product or service listing tagged in the post ("shop this" / "book this") */
    productId: text("product_id"),
    createdAt: created(),
  },
  (t) => [index("posts_created_idx").on(t.createdAt), index("posts_user_idx").on(t.userId)],
);

export const postLikes = pgTable("post_likes", { postId: text("post_id").notNull(), userId: text("user_id").notNull(), createdAt: created() }, (t) => [
  primaryKey({ columns: [t.postId, t.userId] }),
]);

export const postSaves = pgTable("post_saves", { postId: text("post_id").notNull(), userId: text("user_id").notNull(), createdAt: created() }, (t) => [
  primaryKey({ columns: [t.postId, t.userId] }),
]);

/** Who follows whom (community). */
export const follows = pgTable("follows", { followerId: text("follower_id").notNull(), followingId: text("following_id").notNull(), createdAt: created() }, (t) => [
  primaryKey({ columns: [t.followerId, t.followingId] }),
  index("follows_following_idx").on(t.followingId),
]);

/** 24-hour stories. */
export const stories = pgTable(
  "stories",
  {
    id: id(),
    userId: text("user_id").notNull(),
    media: jsonb("media").$type<Media>().notNull(),
    caption: text("caption").notNull().default(""),
    placeId: text("place_id"),
    productId: text("product_id"),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: created(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("stories_exp_idx").on(t.expiresAt)],
);

/** In-app notifications (likes, comments, follows, orders, payouts). */
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id").notNull(),
    actorId: text("actor_id"),
    type: text("type").notNull(),
    text: text("text").notNull(),
    href: text("href").notNull().default(""),
    read: boolean("read").notNull().default(false),
    createdAt: created(),
  },
  (t) => [index("notif_user_idx").on(t.userId, t.createdAt)],
);

export const comments = pgTable(
  "comments",
  {
    id: id(),
    postId: text("post_id").notNull(),
    userId: text("user_id").notNull(),
    text: text("text").notNull(),
    status: text("status").$type<ContentStatus>().notNull().default("visible"),
    createdAt: created(),
  },
  (t) => [index("comments_post_idx").on(t.postId)],
);

export const reports = pgTable("reports", {
  id: id(),
  targetType: text("target_type").notNull(), // post | comment | product | user
  targetId: text("target_id").notNull(),
  userId: text("user_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"), // open | resolved | dismissed
  createdAt: created(),
});

export type ReviewStatus = "pending" | "approved" | "rejected";

export const reviews = pgTable("reviews", {
  id: id(),
  userId: text("user_id"),
  name: text("name").notNull(),
  from: text("from").notNull().default(""),
  trip: text("trip").notNull().default(""),
  rating: integer("rating").notNull(),
  text: text("text").notNull(),
  placeImage: text("place_image").notNull().default(""),
  status: text("status").$type<ReviewStatus>().notNull().default("pending"),
  rewarded: boolean("rewarded").notNull().default(false),
  createdAt: created(),
});

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export const blogPosts = pgTable("blog_posts", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  category: text("category").notNull().default("Guides"),
  cover: text("cover").notNull().default(""),
  author: text("author").notNull().default("Tembea254 Team"),
  readMins: integer("read_mins").notNull().default(4),
  sections: jsonb("sections").notNull().default(sql`'[]'::jsonb`),
  related: jsonb("related"),
  status: text("status").notNull().default("published"), // draft | published
  publishedAt: text("published_at"),
  updatedAt: updated(),
});

export const safetyAlerts = pgTable("safety_alerts", {
  id: id(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  level: text("level").notNull().default("info"), // info | warning | critical
  region: text("region").notNull().default("All Kenya"),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});

/** Admin-managed phrasebook entries shown in the translator. */
export const phrases = pgTable("phrases", {
  id: id(),
  category: text("category").notNull().default("Basics"),
  english: text("english").notNull(),
  translations: jsonb("translations").$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
  published: boolean("published").notNull().default(true),
  createdAt: created(),
});

export const translationLogs = pgTable("translation_logs", {
  id: id(),
  userId: text("user_id"),
  fromLang: text("from_lang").notNull(),
  toLang: text("to_lang").notNull(),
  chars: integer("chars").notNull().default(0),
  engine: text("engine").notNull().default("phrasebook"),
  createdAt: created(),
});

/* ------------------------------------------------------------------ */
/* Hire marketplace (drivers, guides, photographers, artists)          */
/* ------------------------------------------------------------------ */

export const providers = pgTable("providers", {
  id: id(),
  userId: text("user_id"),
  hub: text("hub").notNull(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  base: text("base").notNull().default(""),
  headline: text("headline").notNull().default(""),
  about: text("about").notNull().default(""),
  offer: text("offer").notNull().default(""),
  rate: integer("rate").notNull(),
  unit: text("unit").notNull(),
  terms: text("terms").notNull().default(""),
  languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
  years: integer("years").notNull().default(0),
  specialties: text("specialties").array().notNull().default(sql`'{}'::text[]`),
  checks: text("checks").array().notNull().default(sql`'{}'::text[]`),
  image: text("image").notNull().default(""),
  status: text("status").notNull().default("active"), // pending | active | hidden
  demo: boolean("demo").notNull().default(false),
  createdAt: created(),
});

export const hires = pgTable("hires", {
  id: id(),
  userId: text("user_id").notNull(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  start: text("start").notNull(),
  units: integer("units").notNull(),
  people: integer("people").notNull(),
  pickup: text("pickup").notNull().default(""),
  note: text("note").notNull().default(""),
  phone: text("phone").notNull(),
  total: integer("total").notNull(),
  deposit: integer("deposit").notNull(),
  status: text("status").notNull().default("requested"), // requested | confirmed | deposit-pending | deposit-paid | completed | cancelled
  paymentId: text("payment_id"),
  createdAt: created(),
});

/** Applications to become a hire provider, a shop vendor or a creator. */
export const applications = pgTable("applications", {
  id: id(),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(), // provider | vendor | creator
  data: jsonb("data").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  note: text("note"),
  reviewedBy: text("reviewed_by"),
  createdAt: created(),
});

/* ------------------------------------------------------------------ */
/* Shop: Kenyan-made products sold by verified vendors                 */
/* ------------------------------------------------------------------ */

export type VendorStatus = "pending" | "verified" | "suspended" | "rejected";

export const vendors = pgTable(
  "vendors",
  {
    id: id(),
    userId: text("user_id").notNull(),
    storeName: text("store_name").notNull(),
    slug: text("slug").notNull(),
    tagline: text("tagline").notNull().default(""),
    description: text("description").notNull().default(""),
    logo: text("logo"),
    banner: text("banner"),
    location: text("location").notNull().default(""),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    phone: text("phone").notNull(),
    payoutMethod: text("payout_method").notNull().default("mpesa"), // mpesa | bank
    payoutAccount: text("payout_account").notNull().default(""),
    /** KYC: national ID, KRA PIN, business registration number */
    kyc: jsonb("kyc").$type<{ idNumber?: string; kraPin?: string; businessReg?: string }>().notNull().default(sql`'{}'::jsonb`),
    status: text("status").$type<VendorStatus>().notNull().default("pending"),
    /** overrides the default commission for this vendor (0.10 = 10%) */
    commissionRate: real("commission_rate"),
    note: text("note"),
    /** maker (sells products) | pro (sells services: drivers, guides, photographers, artists) | both */
    sellerType: text("seller_type").notNull().default("maker"),
    /** home area for pros: mara | diani | tsavo | nairobi … */
    hub: text("hub"),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    /** policy strikes (fake goods, no-shows, late shipping); too many suspends the store */
    strikes: integer("strikes").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    createdAt: created(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("vendors_user_idx").on(t.userId), uniqueIndex("vendors_slug_idx").on(t.slug)],
);

export type ProductStatus = "draft" | "pending" | "active" | "rejected" | "hidden";

export const products = pgTable(
  "products",
  {
    id: id(),
    vendorId: text("vendor_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull(),
    price: integer("price").notNull(),
    compareAt: integer("compare_at"),
    stock: integer("stock").notNull().default(0),
    images: text("images").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    madeIn: text("made_in").notNull().default(""),
    status: text("status").$type<ProductStatus>().notNull().default("pending"),
    rejectReason: text("reject_reason"),
    salesCount: integer("sales_count").notNull().default(0),
    /** product (shipped) | service (booked for a date) */
    kind: text("kind").notNull().default("product"),
    /** services: drivers | photographers | artists | guides | experiences */
    serviceType: text("service_type"),
    hub: text("hub"),
    /** item | day | half-day | hour | session | person | trip */
    unit: text("unit").notNull().default("item"),
    /** seller ships it, or it's stocked at a Tembea hub (Tembea Express, faster delivery) */
    fulfilledBy: text("fulfilled_by").notNull().default("seller"),
    languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
    capacity: integer("capacity"),
    ratingAvg: real("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("products_vendor_idx").on(t.vendorId), index("products_status_idx").on(t.status)],
);

export type OrderStatus = "pending_payment" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export const orders = pgTable(
  "orders",
  {
    id: id(),
    userId: text("user_id").notNull(),
    buyerName: text("buyer_name").notNull(),
    phone: text("phone").notNull(),
    address: jsonb("address").$type<{ county: string; town: string; details: string }>().notNull(),
    subtotal: integer("subtotal").notNull(),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    total: integer("total").notNull(),
    commission: integer("commission").notNull().default(0),
    status: text("status").$type<OrderStatus>().notNull().default("pending_payment"),
    paymentId: text("payment_id"),
    /** home | pickup (a Tembea pick-up station) | none (services only) */
    deliveryMethod: text("delivery_method").notNull().default("home"),
    pickupStation: text("pickup_station"),
    trackingNumber: text("tracking_number"),
    /** delivery promise shown to the buyer ("arrives Thu 31 – Sat 2 Nov") */
    etaFrom: timestamp("eta_from", { withTimezone: true }),
    etaTo: timestamp("eta_to", { withTimezone: true }),
    createdAt: created(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("orders_user_idx").on(t.userId)],
);

export type Fulfilment = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id").notNull(),
    productId: text("product_id").notNull(),
    vendorId: text("vendor_id").notNull(),
    title: text("title").notNull(),
    image: text("image"),
    price: integer("price").notNull(),
    qty: integer("qty").notNull(),
    lineTotal: integer("line_total").notNull(),
    commissionRate: real("commission_rate").notNull(),
    commission: integer("commission").notNull(),
    vendorAmount: integer("vendor_amount").notNull(),
    fulfilment: text("fulfilment").$type<Fulfilment>().notNull().default("pending"),
    trackingNote: text("tracking_note"),
    /** product | service */
    kind: text("kind").notNull().default("product"),
    /** services: the booked date (YYYY-MM-DD) and the buyer's notes (pick-up point, group size…) */
    bookingDate: text("booking_date"),
    bookingNote: text("booking_note").notNull().default(""),
    /** returns: requested | approved | rejected | refunded */
    returnStatus: text("return_status"),
    returnReason: text("return_reason"),
    reviewed: boolean("reviewed").notNull().default(false),
    updatedAt: updated(),
  },
  (t) => [index("items_order_idx").on(t.orderId), index("items_vendor_idx").on(t.vendorId)],
);

/** Parcel tracking timeline, Amazon-style: placed → packed → handed to courier → in transit → at pick-up / out for delivery → delivered. */
export const shipmentEvents = pgTable(
  "shipment_events",
  {
    id: id(),
    orderId: text("order_id").notNull(),
    status: text("status").notNull(),
    title: text("title").notNull(),
    note: text("note").notNull().default(""),
    location: text("location").notNull().default(""),
    createdAt: created(),
  },
  (t) => [index("ship_order_idx").on(t.orderId)],
);

/** Verified-purchase reviews of products and services. */
export const productReviews = pgTable(
  "product_reviews",
  {
    id: id(),
    productId: text("product_id").notNull(),
    vendorId: text("vendor_id").notNull(),
    userId: text("user_id").notNull(),
    orderItemId: text("order_item_id"),
    rating: integer("rating").notNull(),
    text: text("text").notNull().default(""),
    images: text("images").array().notNull().default(sql`'{}'::text[]`),
    status: text("status").$type<ContentStatus>().notNull().default("visible"),
    createdAt: created(),
  },
  (t) => [index("prev_product_idx").on(t.productId), index("prev_vendor_idx").on(t.vendorId)],
);

export const wishlist = pgTable("wishlist", { userId: text("user_id").notNull(), productId: text("product_id").notNull(), createdAt: created() }, (t) => [
  primaryKey({ columns: [t.userId, t.productId] }),
]);

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export type PaymentPurpose = "order" | "hire_deposit";

export const payments = pgTable(
  "payments",
  {
    id: id(),
    userId: text("user_id"),
    purpose: text("purpose").$type<PaymentPurpose>().notNull(),
    refId: text("ref_id").notNull(),
    amount: integer("amount").notNull(),
    method: text("method").notNull().default("mpesa"), // mpesa | demo
    phone: text("phone"),
    status: text("status").notNull().default("pending"), // pending | paid | failed | refunded
    checkoutRequestId: text("checkout_request_id"),
    receipt: text("receipt"),
    message: text("message"),
    createdAt: created(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("payments_checkout_idx").on(t.checkoutRequestId)],
);

/** Money Tembea owes vendors and creators, and when it was paid. */
export const payouts = pgTable("payouts", {
  id: id(),
  userId: text("user_id").notNull(),
  payeeType: text("payee_type").notNull(), // vendor | creator
  amount: integer("amount").notNull(),
  method: text("method").notNull().default("mpesa"),
  destination: text("destination").notNull().default(""),
  status: text("status").notNull().default("requested"), // requested | approved | paid | rejected
  reference: text("reference"),
  note: text("note"),
  createdAt: created(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

/** Token movements: rewards earned and spent. */
export const tokenLedger = pgTable("token_ledger", {
  id: id(),
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(), // + earned, − spent
  reason: text("reason").notNull(),
  refType: text("ref_type"),
  refId: text("ref_id"),
  createdAt: created(),
});

/* ------------------------------------------------------------------ */
/* System                                                              */
/* ------------------------------------------------------------------ */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updated(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id"),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  target: text("target"),
  meta: jsonb("meta"),
  createdAt: created(),
});
