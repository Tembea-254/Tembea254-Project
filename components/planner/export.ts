import { PLACE_BY_ID } from "@/lib/data/places";
import type { Trip } from "@/lib/planner/types";
import { fmtDate } from "@/lib/utils";

export function tripAsText(trip: Trip) {
  const lines = [`${trip.title}`, `${trip.stops.map((s) => `${PLACE_BY_ID[s.placeId].name} (${s.nights}n)`).join(" → ")}`, ""];
  trip.days.forEach((d, i) => {
    lines.push(`Day ${i + 1} · ${fmtDate(d.date)} · ${d.title}`);
    d.items.forEach((it) => lines.push(`  ${it.time}  ${it.title}${it.notes ? ` — ${it.notes}` : ""}`));
    lines.push("");
  });
  lines.push("Planned with Tembea254");
  return lines.join("\n");
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function downloadJSON(trip: Trip) {
  download(`${slug(trip.title)}.json`, JSON.stringify(trip, null, 2), "application/json");
}

/** iCalendar export: one event per itinerary item so the trip lands in Google/Apple/Outlook calendars. */
export function downloadICS(trip: Trip) {
  const esc = (s: string) => s.replace(/[,;\\]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ev: string[] = [];
  trip.days.forEach((d) =>
    d.items.forEach((it) => {
      const [h, m] = it.time.split(":").map(Number);
      const start = `${d.date.replace(/-/g, "")}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
      const endMins = h * 60 + m + (it.minutes ?? 60);
      const eh = Math.min(23, Math.floor(endMins / 60));
      const em = eh === 23 && endMins >= 24 * 60 ? 59 : endMins % 60;
      const end = `${d.date.replace(/-/g, "")}T${String(eh).padStart(2, "0")}${String(em).padStart(2, "0")}00`;
      ev.push(
        "BEGIN:VEVENT",
        `UID:${it.id}@tembea254`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Africa/Nairobi:${start}`,
        `DTEND;TZID=Africa/Nairobi:${end}`,
        `SUMMARY:${esc(it.title)}`,
        `LOCATION:${esc(PLACE_BY_ID[d.placeId]?.name ?? "Kenya")}`,
        ...(it.notes ? [`DESCRIPTION:${esc(it.notes)}`] : []),
        "END:VEVENT",
      );
    }),
  );
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tembea254//Trip Planner//EN", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n");
  download(`${slug(trip.title)}.ics`, ics, "text/calendar");
}
