/**
 * Transactional email through Resend (https://resend.com, free tier is enough to start).
 * Set RESEND_API_KEY and EMAIL_FROM (an address on a domain you verified in Resend, e.g.
 * "Tembea254 Bookings <bookings@tembea254.com>"). Without a key, emails are skipped and logged:
 * booking requests still reach partners through their dashboard.
 */
export const emailEnabled = () => !!process.env.RESEND_API_KEY;

export async function sendEmail(msg: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter((x) => /^\S+@\S+\.\S+$/.test(x));
  if (!key || !to.length) {
    if (!key) console.info("[email] RESEND_API_KEY not set; skipped:", msg.subject);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Tembea254 <onboarding@resend.dev>",
        to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo && /^\S+@\S+\.\S+$/.test(msg.replyTo) ? { reply_to: msg.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.error("[email]", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error("[email]", e);
    return false;
  }
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
