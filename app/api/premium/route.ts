import { handler, json } from "@/lib/api";
import { normalizePhone } from "@/lib/mpesa";
import { startPayment } from "@/lib/payments";
import { isPro } from "@/lib/premium";
import { currentUser, requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getUserById } from "@/lib/users";

export const dynamic = "force-dynamic";

/** GET: is the signed-in traveller Premium, until when, and the monthly price. */
export const GET = handler(async () => {
  const [me, st] = await Promise.all([currentUser().catch(() => null), getSettings()]);
  return json({ pro: isPro(me), until: me?.proUntil ?? null, priceKes: st.proPriceKes });
});

/** POST { phone }: one Premium month by M-Pesa (demo mode without MPESA_* keys: no money moves). */
export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const st = await getSettings();
  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) return json({ error: "Enter the M-Pesa number to charge, e.g. 0712 345 678" }, 400);
  const r = await startPayment({ userId: me.id, purpose: "premium", refId: me.id, amount: st.proPriceKes, phone, description: "Tembea Premium" });
  const fresh = await getUserById(me.id);
  return json({ ...r, pro: isPro(fresh), until: fresh?.proUntil ?? null });
});
