import { handler, json, body } from "@/lib/api";
import { LANG_BY_CODE } from "@/lib/data/languages";
import { engineStatus, rateLimit, translateServer } from "@/lib/mt-server";
import { HttpError, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
// room for the model service to wake up on a cold start
export const maxDuration = 30;

/** POST { text, from, to }  ->  { text, engine, pivot?, experimental } */
export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  rateLimit(me.id);

  const b = await body<{ text?: unknown; from?: unknown; to?: unknown }>(req);
  const text = typeof b.text === "string" ? b.text.trim() : "";
  const from = String(b.from ?? "");
  const to = String(b.to ?? "");

  if (!text) throw new HttpError(400, "Nothing to translate.");
  if (text.length > 500) throw new HttpError(400, "Please keep it under 500 characters.");
  if (!LANG_BY_CODE[from] || !LANG_BY_CODE[to]) throw new HttpError(400, "Unsupported language.");
  if (from === to) return json({ text, engine: "none", experimental: false });

  return json(await translateServer(text, from, to));
});

/** GET -> which engines are up (used for monitoring and the translator status line) */
export const GET = handler(async () => {
  await requireUser();
  return json(await engineStatus());
});
