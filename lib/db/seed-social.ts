import { eq } from "drizzle-orm";
import { IMG } from "../data/images";
import type { Media } from "./schema";
import type { DB } from "./index";
import * as s from "./schema";

/**
 * Demo community content (v3): the demo pros and maker stores post like real accounts —
 * photos from the road, tips, tagged listings ("Book this" / "Shop this") and a few stories —
 * so the community feels alive from the first visit. All authors are clearly demo sellers.
 */
const img = (url: string): Media => ({ type: "image", url });
const DAY = 86400_000;

const POSTS: { id: string; user: string; kind?: string; text: string; place?: string; media: Media[]; product?: string; daysAgo: number; likes: number; comments: number; views?: number; rating?: number }[] = [
  { id: "sp_1", user: "demo-pro-mara-p1", text: "Golden hour at the Talek river crossing. We waited three hours and the herd went all at once. #greatmigration #maasaimara #wildlifephotography", place: "maasai-mara", media: [img(IMG.maraMigration), img(IMG.maraSunset)], product: "svc_mara-p1", daysAgo: 0.2, likes: 412, comments: 38, views: 5200 },
  { id: "sp_2", user: "demo-pro-dia-g1", kind: "tip", text: "Kisite tip: book the 7am boat. Dolphins are most active before the sun gets high and the water is glassy. Bring reef-safe sunscreen — we refill bottles on board. #diani #kisite #snorkelling", place: "diani", media: [img(IMG.dianiShore)], product: "svc_dia-g1", daysAgo: 0.6, likes: 188, comments: 21 },
  { id: "sp_3", user: "demo-maker-kiondo-weavers", text: "Every kiondo takes Mama Mutheu about four days. This one is going to Berlin. Thank you for supporting our women's group! #handmadeinkenya #kiondo #shoplocal", media: [img("photo-1601330862030-1e08c703ac04"), img("photo-1455669175216-9017c9b02fc6")], product: "p_dk1", daysAgo: 1, likes: 265, comments: 17 },
  { id: "sp_4", user: "demo-pro-mara-g1", text: "Walking safari this morning: lion tracks, fresh, maybe an hour old. On foot you learn to read the ground the way my grandfather did. #walkingsafari #maasaimara", place: "maasai-mara", media: [img(IMG.maraLion)], product: "svc_mara-g1", daysAgo: 1.4, likes: 530, comments: 46, views: 7300 },
  { id: "sp_5", user: "demo-pro-nbo-g1", kind: "tip", text: "Nairobi in a day: Giraffe Centre at 9, Karen Blixen at 11, nyama choma lunch, then the National Park at 3pm when the animals come out again. #nairobi #citysafari", place: "nairobi", media: [img(IMG.nairobiParkGiraffe), img(IMG.nairobiSkyline)], product: "svc_nbo-g1", daysAgo: 2, likes: 141, comments: 12 },
  { id: "sp_6", user: "demo-pro-tsv-p1", text: "Tsavo's elephants are red from the soil — they dust-bathe to keep cool. No filter on this one. #tsavo #redelephants", place: "tsavo-east", media: [img(IMG.tsavoElephants)], product: "svc_tsv-p1", daysAgo: 2.5, likes: 377, comments: 29, views: 4100 },
  { id: "sp_7", user: "demo-maker-nasieku-beads", text: "Red for bravery, blue for the sky, green for the land, white for peace. Every necklace tells a story. New colours dropping this week. #maasaibeadwork #handmadeinkenya", media: [img("photo-1606094092594-93c09d76b721"), img(IMG.maasaiWomen)], product: "p_db1", daysAgo: 3, likes: 298, comments: 24 },
  { id: "sp_8", user: "demo-pro-dia-p1", text: "Sunset session on Galu beach for a lovely couple from Lyon. Message us to book your shoot — we bring the props. #diani #honeymoon #beachphotography", place: "diani", media: [img(IMG.dianiSunset), img(IMG.dianiPalms)], product: "svc_dia-p1", daysAgo: 3.6, likes: 221, comments: 15 },
  { id: "sp_9", user: "demo-pro-mara-d1", kind: "question", text: "Travellers: would you rather a full day in the Mara with a packed lunch, or two half-day drives with a break at camp? Tell us what you prefer. #maasaimara #safaritips", place: "maasai-mara", media: [img(IMG.maraBalloon)], daysAgo: 4, likes: 96, comments: 58 },
  { id: "sp_10", user: "demo-maker-lamu-leather", text: "Hand-stitched in Lamu Old Town, the way it's been done for generations. #lamu #leather #handmadeinkenya", place: "lamu", media: [img(IMG.lamuTown), img(IMG.lamuDhow)], daysAgo: 4.5, likes: 174, comments: 9 },
  { id: "sp_11", user: "demo-pro-dia-a1", text: "Taarab night at the beach hotel — the oud, the qanun and a full moon. We play weddings and private dinners too. #taarab #swahiliculture #diani", place: "diani", media: [img(IMG.mombasaSunrise)], product: "svc_dia-a1", daysAgo: 5, likes: 133, comments: 11 },
  { id: "sp_12", user: "demo-pro-tsv-g2", kind: "tip", text: "Taita Hills cloud forest: start early, wear proper shoes, and look for the Taita thrush — it lives nowhere else on Earth. #taitahills #birding", place: "tsavo-east", media: [img(IMG.mountKenyaHike)], product: "svc_tsv-g2", daysAgo: 6, likes: 87, comments: 7 },
  { id: "sp_13", user: "demo-pro-nbo-p1", text: "Nairobi after dark. The city has a skyline now — come shoot it with us. #nairobi #citylights", place: "nairobi", media: [img(IMG.nairobiNight)], product: "svc_nbo-p1", daysAgo: 6.5, likes: 256, comments: 19, views: 3100 },
  { id: "sp_14", user: "demo-maker-akamba-carvers", kind: "review", rating: 5, text: "Review from a buyer in Toronto: 'The carving arrived in 6 days, wrapped beautifully, and it's even better in person.' Asante sana! #akambacarvings #handmadeinkenya", media: [img("photo-1696586904897-aa8590c88f92")], product: "p_da1", daysAgo: 7, likes: 149, comments: 6 },
  { id: "sp_15", user: "demo-pro-mara-a2", text: "Beadwork class under the acacia today. Everyone went home with a bracelet they made themselves. #maasaibeadwork #culturalexperience", place: "maasai-mara", media: [img(IMG.maasaiShuka)], product: "svc_mara-a2", daysAgo: 8, likes: 118, comments: 10 },
  { id: "sp_16", user: "demo-pro-dia-g2", text: "Inside the sacred Kaya Kinondo forest — no shoes, no smoking, and you ask the elders before you photograph. Respect makes the visit special. #diani #kaya #unesco", place: "diani", media: [img(IMG.watamuBay)], product: "svc_dia-g2", daysAgo: 9, likes: 102, comments: 8 },
];

const STORIES: { id: string; user: string; media: Media; caption: string; place?: string; product?: string; hoursAgo: number }[] = [
  { id: "ss_1", user: "demo-pro-mara-p1", media: img(IMG.maraSunset), caption: "Tonight's sunset from the Talek ridge", place: "maasai-mara", product: "svc_mara-p1", hoursAgo: 2 },
  { id: "ss_2", user: "demo-pro-mara-p1", media: img(IMG.maraLion), caption: "Morning visitors", place: "maasai-mara", hoursAgo: 5 },
  { id: "ss_3", user: "demo-pro-dia-g1", media: img(IMG.dianiShore), caption: "Water is perfect today. Two spots left on the 7am boat!", place: "diani", product: "svc_dia-g1", hoursAgo: 3 },
  { id: "ss_4", user: "demo-maker-nasieku-beads", media: img("photo-1606094092594-93c09d76b721"), caption: "New colours on the table", product: "p_db1", hoursAgo: 6 },
  { id: "ss_5", user: "demo-pro-nbo-g1", media: img(IMG.nairobiParkZebra), caption: "Zebra crossing — the real kind", place: "nairobi", hoursAgo: 8 },
  { id: "ss_6", user: "demo-pro-tsv-p1", media: img(IMG.tsavoElephants), caption: "Red giants at Aruba dam", place: "tsavo-east", product: "svc_tsv-p1", hoursAgo: 10 },
  { id: "ss_7", user: "demo-maker-kiondo-weavers", media: img("photo-1455669175216-9017c9b02fc6"), caption: "Weaving circle, Thursday morning", product: "p_dk1", hoursAgo: 12 },
];

const COMMENTS: Record<string, string[]> = {
  sp_1: ["This is unreal when is the best month to see this?", "July to October for the crossings — August is peak.", "Booked for next year!"],
  sp_4: ["Did you feel safe on foot?", "Always with an armed ranger and an experienced guide. Very safe."],
  sp_9: ["Two half-days! The midday heat is brutal.", "Full day — you never know when the cats show up."],
  sp_3: ["Just ordered one", "Arrived in Nairobi in 2 days, beautiful work."],
};

export async function seedSocial(db: DB) {
  const now = Date.now();
  const people = Array.from(new Set([...POSTS.map((p) => p.user), ...STORIES.map((x) => x.user)]));
  for (const p of POSTS) {
    const tags = Array.from(new Set((p.text.match(/#[\p{L}\p{N}_]{2,40}/gu) ?? []).map((t) => t.slice(1).toLowerCase())));
    await db
      .insert(s.posts)
      .values({
        id: p.id,
        userId: p.user,
        kind: p.kind ?? "update",
        text: p.text,
        tags,
        placeId: p.place ?? null,
        media: p.media,
        productId: p.product ?? null,
        rating: p.rating ?? null,
        likeCount: p.likes,
        commentCount: COMMENTS[p.id]?.length ?? 0,
        shareCount: Math.round(p.likes / 9),
        viewCount: p.views ?? p.likes * 8,
        createdAt: new Date(now - p.daysAgo * DAY),
      })
      .onConflictDoNothing();
    for (const [i, text] of (COMMENTS[p.id] ?? []).entries()) {
      const author = i % 2 === 1 ? p.user : people[(people.indexOf(p.user) + i + 3) % people.length];
      await db
        .insert(s.comments)
        .values({ id: `sc_${p.id}_${i}`, postId: p.id, userId: author, text, createdAt: new Date(now - p.daysAgo * DAY + (i + 1) * 3600_000) })
        .onConflictDoNothing();
    }
  }
  for (const st of STORIES) {
    await db
      .insert(s.stories)
      .values({ id: st.id, userId: st.user, media: st.media, caption: st.caption, placeId: st.place ?? null, productId: st.product ?? null, createdAt: new Date(now - st.hoursAgo * 3600_000), expiresAt: new Date(now + 30 * DAY) })
      .onConflictDoNothing();
  }
  // demo accounts follow each other a little, and the Tembea team follows everyone
  for (const [i, a] of people.entries()) {
    await db.insert(s.follows).values({ followerId: "tembea-team", followingId: a }).onConflictDoNothing();
    const b = people[(i + 1) % people.length];
    if (b !== a) await db.insert(s.follows).values({ followerId: a, followingId: b }).onConflictDoNothing();
  }
  await db.update(s.users).set({ handle: "tembea", bio: "Official Tembea254 team. Tips, alerts and the best of Kenya." }).where(eqId("tembea-team"));
}

const eqId = (id: string) => eq(s.users.id, id);
