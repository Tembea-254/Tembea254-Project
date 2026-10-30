import { handler, json } from "@/lib/api";
import { activeStories } from "@/lib/repo/community";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const me = await currentUser();
  return json({ stories: await activeStories(me?.id ?? null) });
});
