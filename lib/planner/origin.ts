/**
 * Where the traveller starts from. Visitors from abroad land at JKIA (or Mombasa);
 * Kenyans start the trip from home, so there's no Nairobi "arrival" stop and the trip ends back home.
 */
export interface Origin {
  kind: "abroad" | "kenya";
  /** country name, for visitors */
  country?: string;
  /** home city id (see HOME_CITIES), for Kenyans */
  city?: string;
}

/** Home cities and the planner place used to estimate travel from there. */
export const HOME_CITIES: { id: string; name: string; near: string }[] = [
  { id: "nairobi", name: "Nairobi", near: "nairobi" },
  { id: "mombasa", name: "Mombasa", near: "mombasa" },
  { id: "kisumu", name: "Kisumu", near: "lake-nakuru" },
  { id: "nakuru", name: "Nakuru", near: "lake-nakuru" },
  { id: "eldoret", name: "Eldoret", near: "lake-nakuru" },
  { id: "naivasha", name: "Naivasha", near: "naivasha" },
  { id: "nyeri", name: "Nyeri", near: "mount-kenya" },
  { id: "malindi", name: "Malindi / Watamu", near: "watamu" },
  { id: "diani", name: "Diani / Ukunda", near: "diani" },
];
export const HOME_BY_ID = Object.fromEntries(HOME_CITIES.map((c) => [c.id, c]));

export const COUNTRIES = ["United States", "United Kingdom", "Germany", "France", "Italy", "Netherlands", "Spain", "China", "India", "South Africa", "Uganda", "Tanzania", "Nigeria", "UAE", "Canada", "Australia"];

export function originLabel(o?: Origin) {
  if (!o) return "";
  return o.kind === "kenya" ? `from ${HOME_BY_ID[o.city ?? "nairobi"]?.name ?? "home"}` : o.country ? `from ${o.country}` : "from abroad";
}
