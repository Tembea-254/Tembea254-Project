import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PROVIDER_BY_ID } from "@/lib/data/market";
import { newId, readJSON, writeJSON } from "@/lib/json-store";
import { normalizePhone, stkPush } from "@/lib/mpesa";

export const dynamic = "force-dynamic";

export interface Hire {
  id: string;
  email: string;
  providerId: string;
  providerName: string;
  start: string; // YYYY-MM-DD
  units: number;
  people: number;
  pickup: string;
  note: string;
  phone: string;
  total: number;
  deposit: number;
  status: "requested" | "deposit-pending" | "deposit-paid" | "deposit-failed" | "demo-deposit";
  checkoutRequestId?: string;
  message?: string;
  createdAt: number;
}

const FILE = "hires.json";
const view = (h: Hire) => ({ id: h.id, providerId: h.providerId, providerName: h.providerName, start: h.start, units: h.units, people: h.people, total: h.total, deposit: h.deposit, status: h.status, message: h.message, createdAt: h.createdAt });

/** My hire requests, or one by ?id= (used to poll a deposit). */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ hires: [] });
  const all = await readJSON<Hire[]>(FILE, []);
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const h = all.find((x) => x.id === id && x.email === email);
    return h ? NextResponse.json({ hire: view(h) }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ hires: all.filter((h) => h.email === email).map(view) });
}

/**
 * Request to hire a provider in advance. Prices are recalculated on the server.
 * With payDeposit, a 30% deposit is requested by M-Pesa STK push (demo mode without keys).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Please sign in to hire." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const p = PROVIDER_BY_ID[String(b.providerId)];
  if (!p) return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  const start = String(b.start || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || new Date(start + "T23:59:59") < new Date()) return NextResponse.json({ error: "Choose a date from today onwards." }, { status: 400 });
  const phone = normalizePhone(String(b.phone || ""));
  if (!phone) return NextResponse.json({ error: "Enter a valid Safaricom number, e.g. 0712 345 678." }, { status: 400 });
  const units = Math.min(30, Math.max(1, Math.round(Number(b.units) || 1)));
  const people = Math.min(60, Math.max(1, Math.round(Number(b.people) || 1)));
  const total = p.rate * units;
  const deposit = Math.ceil((total * 0.3) / 100) * 100;

  const hire: Hire = {
    id: newId("h_"),
    email: session.user.email,
    providerId: p.id,
    providerName: p.name,
    start,
    units,
    people,
    pickup: String(b.pickup || "").slice(0, 120),
    note: String(b.note || "").slice(0, 600),
    phone,
    total,
    deposit,
    status: "requested",
    message: "Request sent — the provider confirms availability, usually within a few hours.",
    createdAt: Date.now(),
  };

  if (b.payDeposit) {
    try {
      const r = await stkPush(phone, deposit, "Tembea254", `Hire ${hire.id}`);
      if (r.mode === "demo") {
        hire.status = "demo-deposit";
        hire.message = r.message;
      } else {
        hire.status = "deposit-pending";
        hire.checkoutRequestId = r.checkoutRequestId;
        hire.message = r.message;
      }
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "M-Pesa is unavailable right now." }, { status: 502 });
    }
  }

  const all = await readJSON<Hire[]>(FILE, []);
  await writeJSON(FILE, [hire, ...all]);
  return NextResponse.json({ hire: view(hire) });
}
