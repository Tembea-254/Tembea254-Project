import type { OfferView } from "@/lib/repo/partners";

/** Partner packages, fetched once per page load and shared by the planner tabs. */
let cache: OfferView[] | null = null;
let pending: Promise<OfferView[]> | null = null;

export const cachedOffers = () => cache;

export function loadOffers() {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch("/api/offers")
    .then(async (res) => (cache = ((await res.json()) as { offers: OfferView[] }).offers ?? []))
    .finally(() => (pending = null));
  return pending;
}
