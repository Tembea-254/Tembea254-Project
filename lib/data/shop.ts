/** Shop categories for Kenyan-made products, with the default Tembea commission per category. */
export const SHOP_CATEGORIES = [
  { id: "beadwork", name: "Beadwork & jewellery", commission: 0.12 },
  { id: "garments", name: "Kikoi, kanga & garments", commission: 0.12 },
  { id: "carvings", name: "Wood & soapstone carvings", commission: 0.15 },
  { id: "baskets", name: "Baskets & kiondo", commission: 0.12 },
  { id: "art", name: "Art & paintings", commission: 0.15 },
  { id: "leather", name: "Leather & sandals", commission: 0.12 },
  { id: "home", name: "Home décor & textiles", commission: 0.12 },
  { id: "food", name: "Tea, coffee & spices", commission: 0.08 },
] as const;

export type ShopCategoryId = (typeof SHOP_CATEGORIES)[number]["id"];
export const SHOP_CATEGORY_BY_ID = Object.fromEntries(SHOP_CATEGORIES.map((c) => [c.id, c])) as Record<string, (typeof SHOP_CATEGORIES)[number]>;

export const KENYA_COUNTIES = [
  "Nairobi", "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru",
  "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
  "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet",
  "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira",
];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Services anyone can sell on the open marketplace (like a store, but booked for a date). */
export const SERVICE_TYPES = [
  { id: "drivers", name: "Drivers & vehicles", short: "Drivers", blurb: "Safari 4x4s, vans, airport transfers" },
  { id: "guides", name: "Tour & local guides", short: "Guides", blurb: "Walking, birding, city and marine guides" },
  { id: "photographers", name: "Photographers", short: "Photographers", blurb: "Safari, beach, couple and event shoots" },
  { id: "artists", name: "Local artists", short: "Artists", blurb: "Dancers, musicians, craft lessons" },
  { id: "experiences", name: "Experiences", short: "Experiences", blurb: "Cooking classes, dhow trips, village visits" },
] as const;
export const SERVICE_TYPE_BY_ID = Object.fromEntries(SERVICE_TYPES.map((c) => [c.id, c])) as Record<string, (typeof SERVICE_TYPES)[number]>;

export const SERVICE_UNITS: Record<string, string> = {
  item: "each",
  day: "per day",
  "half-day": "per half day",
  hour: "per hour",
  session: "per session",
  person: "per person",
  trip: "per trip",
  event: "per event",
};

export const HUB_NAMES: Record<string, string> = { mara: "Maasai Mara", diani: "Diani & South Coast", tsavo: "Tsavo", nairobi: "Nairobi", mombasa: "Mombasa", lamu: "Lamu", naivasha: "Naivasha", nanyuki: "Nanyuki & Mt Kenya", amboseli: "Amboseli" };

/** Tembea pick-up stations (partner shops), Jumia-style. */
export const PICKUP_STATIONS = [
  { id: "nbo-cbd", name: "Nairobi CBD — Moi Avenue", county: "Nairobi" },
  { id: "nbo-westlands", name: "Westlands — Sarit area", county: "Nairobi" },
  { id: "nbo-karen", name: "Karen — Galleria", county: "Nairobi" },
  { id: "nbo-jkia", name: "JKIA — Terminal 1A arrivals desk", county: "Nairobi" },
  { id: "msa-nyali", name: "Mombasa — Nyali Centre", county: "Mombasa" },
  { id: "msa-cbd", name: "Mombasa — Digo Road", county: "Mombasa" },
  { id: "diani", name: "Diani — Ukunda Junction", county: "Kwale" },
  { id: "malindi", name: "Malindi — Lamu Road", county: "Kilifi" },
  { id: "kisumu", name: "Kisumu — Oginga Odinga Street", county: "Kisumu" },
  { id: "nakuru", name: "Nakuru — Kenyatta Avenue", county: "Nakuru" },
  { id: "naivasha", name: "Naivasha — Moi South Lake Road", county: "Nakuru" },
  { id: "narok", name: "Narok town — Total junction", county: "Narok" },
  { id: "eldoret", name: "Eldoret — Uganda Road", county: "Uasin Gishu" },
  { id: "nanyuki", name: "Nanyuki — Kenyatta Highway", county: "Laikipia" },
  { id: "lamu", name: "Lamu — Mokowe jetty", county: "Lamu" },
] as const;

export const TRACKING_STEPS = [
  { id: "placed", title: "Order placed" },
  { id: "paid", title: "Payment confirmed" },
  { id: "packed", title: "Packed by the seller" },
  { id: "shipped", title: "Handed to the courier" },
  { id: "in_transit", title: "On the way" },
  { id: "ready", title: "Out for delivery / ready at pick-up" },
  { id: "delivered", title: "Delivered" },
] as const;
