/** Safaricom Daraja — Lipa na M-Pesa Online (STK push). Server-side only. */

/** 07xx / 01xx / +2547xx → 2547xx (Safaricom format). */
export function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(d)) return "254" + d.slice(1);
  if (/^254[17]\d{8}$/.test(d)) return d;
  if (/^[17]\d{8}$/.test(d)) return "254" + d;
  return null;
}

function cfg() {
  const { MPESA_CONSUMER_KEY: key, MPESA_CONSUMER_SECRET: secret, MPESA_SHORTCODE: shortcode, MPESA_PASSKEY: passkey, MPESA_CALLBACK_URL: callback } = process.env;
  if (!key || !secret || !shortcode || !passkey || !callback) return null;
  const base = process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  return { key, secret, shortcode, passkey, callback, base };
}

export type StkResult = { mode: "demo"; message: string } | { mode: "daraja"; checkoutRequestId: string; message: string };

/** Sends the PIN prompt to the customer's phone. Without MPESA_* keys it runs in demo mode (no money moves). */
export async function stkPush(phone: string, amount: number, reference: string, description: string): Promise<StkResult> {
  const c = cfg();
  if (!c) return { mode: "demo", message: "Demo mode — no payment was taken. Add the MPESA_* keys to .env.local to enable real M-Pesa prompts." };
  const auth = Buffer.from(`${c.key}:${c.secret}`).toString("base64");
  const tok = (await fetch(`${c.base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } }).then((r) => r.json())) as { access_token?: string };
  if (!tok.access_token) throw new Error("Could not authenticate with M-Pesa");
  // Daraja timestamps are in Kenyan time (EAT, UTC+3)
  const ts = new Date(Date.now() + 3 * 3600_000).toISOString().replace(/\D/g, "").slice(0, 14);
  const r = (await fetch(`${c.base}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: c.shortcode,
      Password: Buffer.from(c.shortcode + c.passkey + ts).toString("base64"),
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount),
      PartyA: phone,
      PartyB: c.shortcode,
      PhoneNumber: phone,
      CallBackURL: c.callback,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: description.slice(0, 13),
    }),
  }).then((x) => x.json())) as { ResponseCode?: string; CheckoutRequestID?: string; errorMessage?: string; CustomerMessage?: string };
  if (r.ResponseCode !== "0" || !r.CheckoutRequestID) throw new Error(r.errorMessage || "M-Pesa rejected the request");
  return { mode: "daraja", checkoutRequestId: r.CheckoutRequestID, message: r.CustomerMessage || "Check your phone" };
}
