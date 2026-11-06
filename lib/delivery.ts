import type { Settings } from "./db/settings-defaults";

/**
 * Delivery promise and fees, Amazon/Jumia style. Zones are by county:
 *  - Nairobi metro: 1–2 working days (same/next day for Tembea Express)
 *  - Major towns on the main corridors: 2–3 days
 *  - Everywhere else: 3–5 days
 * Tembea Express items are stocked at a Tembea hub, so they leave a day sooner.
 */
const METRO = ["Nairobi", "Kiambu", "Machakos", "Kajiado"];
const MAJOR = ["Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Kwale", "Kilifi", "Nyeri", "Laikipia", "Meru", "Narok", "Kakamega", "Kericho", "Embu", "Murang'a", "Kirinyaga"];

export type DeliveryMethod = "home" | "pickup";

export function zoneFor(county: string): "metro" | "major" | "remote" {
  if (METRO.includes(county)) return "metro";
  if (MAJOR.includes(county)) return "major";
  return "remote";
}

function addWorkingDays(from: Date, days: number) {
  const d = new Date(from);
  let n = 0;
  while (n < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) n++; // couriers deliver Mon–Sat
  }
  return d;
}

export function deliveryWindow(county: string, express: boolean, from = new Date()) {
  const z = zoneFor(county);
  const [a, b] = z === "metro" ? [1, 2] : z === "major" ? [2, 3] : [3, 5];
  const shift = express ? 1 : 0;
  return { from: addWorkingDays(from, Math.max(1, a - shift)), to: addWorkingDays(from, Math.max(1, b - shift)), zone: z };
}

export function deliveryFee(settings: Settings, county: string, method: DeliveryMethod, subtotal: number) {
  if (subtotal >= settings.freeDeliveryOverKes) return 0;
  if (method === "pickup") return settings.pickupFeeKes;
  return zoneFor(county) === "metro" ? settings.deliveryNairobiKes : settings.deliveryFeeKes;
}

export const fmtDay = (d: Date | string | number) => new Date(d).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
