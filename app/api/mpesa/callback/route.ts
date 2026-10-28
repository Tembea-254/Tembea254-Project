import { NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/json-store";
import type { Hire } from "../../hire/route";

export const dynamic = "force-dynamic";

/** Safaricom calls this URL (MPESA_CALLBACK_URL) with the STK push result. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { Body?: { stkCallback?: { CheckoutRequestID?: string; ResultCode?: number; ResultDesc?: string } } };
  const cb = body.Body?.stkCallback;
  if (cb?.CheckoutRequestID) {
    const all = await readJSON<Hire[]>("hires.json", []);
    const h = all.find((x) => x.checkoutRequestId === cb.CheckoutRequestID);
    if (h) {
      h.status = cb.ResultCode === 0 ? "deposit-paid" : "deposit-failed";
      h.message = cb.ResultDesc;
      await writeJSON("hires.json", all);
    }
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
