import { NextResponse } from "next/server";
import { settleByCheckoutId } from "@/lib/payments";

export const dynamic = "force-dynamic";

/** Safaricom calls this URL (MPESA_CALLBACK_URL) with the STK push result. */
export async function POST(req: Request) {
  type Item = { Name: string; Value?: string | number };
  const b = (await req.json().catch(() => ({}))) as {
    Body?: { stkCallback?: { CheckoutRequestID?: string; ResultCode?: number; ResultDesc?: string; CallbackMetadata?: { Item?: Item[] } } };
  };
  const cb = b.Body?.stkCallback;
  if (cb?.CheckoutRequestID) {
    const receipt = cb.CallbackMetadata?.Item?.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
    await settleByCheckoutId(cb.CheckoutRequestID, cb.ResultCode === 0, cb.ResultDesc, receipt ? String(receipt) : undefined).catch((e) => console.error("[mpesa] callback", e));
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
