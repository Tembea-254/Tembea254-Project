import { NextResponse } from "next/server";
import { PLACE_BY_ID } from "@/lib/data/places";
import { finaliseTrip, generateTrip, makeStops, normaliseRequest } from "@/lib/planner/engine";
import type { Day, Item, ItemType, PlanRequest } from "@/lib/planner/types";
import { addDays, uid } from "@/lib/utils";

/**
 * POST /api/plan
 * With ANTHROPIC_API_KEY set: asks Claude for a Kenya itinerary restricted to our known places,
 * validates it, then normalises through the engine (costs, stays, packing).
 * Without a key (or on any failure): uses the built-in planning engine.
 */
export async function POST(req: Request) {
  let body: PlanRequest;
  try {
    body = (await req.json()) as PlanRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const trip = await planWithClaude(body, key);
      if (trip) return NextResponse.json({ trip });
    } catch (e) {
      console.warn("[plan] AI draft failed, falling back to engine:", e);
    }
  }
  return NextResponse.json({ trip: generateTrip(body) });
}

async function planWithClaude(input: PlanRequest, key: string) {
  const req = normaliseRequest(input);
  const placeList = Object.values(PLACE_BY_ID)
    .map((p) => `${p.id}: ${p.name} (${p.kind}; ideal ${p.idealNights} nights; e.g. ${p.activities.slice(0, 3).map((a) => a.title).join("; ")})`)
    .join("\n");
  const system = `You are Tembea254's Kenya trip planner. Build realistic itineraries using ONLY these place ids:\n${placeList}\n\nRules: sensible geographic order (inland circuit before the coast), total nights = days - 1, morning game drives at 06:00–06:30 in parks, realistic travel. Reply with JSON only.`;
  const user = `Traveller request: "${req.prompt}"
Days: ${req.days}. Start: ${req.startDate}. Travellers: ${req.travelers} (${req.group}). Pace: ${req.style}. Budget: ${req.budget}. Interests: ${req.interests.join(", ") || "any"}. Must include: ${[...req.places, ...req.parsedPlaces].join(", ") || "your choice"}.
Return: {"title": string, "stops":[{"placeId": string, "nights": number}], "days":[{"placeId": string, "title": string, "items":[{"time":"HH:MM","title": string,"type":"activity"|"meal"|"transport"|"stay"|"note","costPerPersonKES": number,"notes"?: string}]}]}
Include exactly ${req.days} days (last day = departure).`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 6000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.map((c) => c.text ?? "").join("");
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
    title?: string;
    stops: { placeId: string; nights: number }[];
    days: { placeId: string; title: string; items: { time: string; title: string; type: ItemType; costPerPersonKES?: number; notes?: string }[] }[];
  };

  const stopsRaw = json.stops.filter((s) => PLACE_BY_ID[s.placeId] && s.nights > 0);
  if (!stopsRaw.length || !Array.isArray(json.days) || json.days.length < 2) return null;
  const stops = makeStops(
    stopsRaw.map((s) => s.placeId),
    stopsRaw.map((s) => Math.round(s.nights)),
    req.budget,
  );
  const types: ItemType[] = ["activity", "meal", "transport", "stay", "note"];
  const days: Day[] = json.days.map((d, i) => ({
    id: uid("d_"),
    date: addDays(req.startDate, i),
    placeId: PLACE_BY_ID[d.placeId] ? d.placeId : stops[Math.min(i, stops.length - 1)].placeId,
    title: String(d.title || `Day ${i + 1}`).slice(0, 80),
    items: (d.items || [])
      .filter((it) => it && it.title)
      .map<Item>((it) => ({
        id: uid("i_"),
        time: /^\d{2}:\d{2}$/.test(it.time) ? it.time : "09:00",
        title: String(it.title).slice(0, 120),
        type: types.includes(it.type) ? it.type : "activity",
        cost: Math.max(0, Math.round(Number(it.costPerPersonKES) || 0)) * req.travelers,
        notes: it.notes ? String(it.notes).slice(0, 240) : undefined,
      }))
      .sort((a, b) => a.time.localeCompare(b.time)),
  }));
  return finaliseTrip(req, stops, days, "ai", json.title);
}
