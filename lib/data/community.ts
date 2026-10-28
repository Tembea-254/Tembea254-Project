import { IMG } from "./images";

export interface PostComment {
  id: string;
  author: string;
  authorImage?: string;
  text: string;
  createdAt: number;
}

export interface Post {
  id: string;
  author: string;
  authorImage?: string;
  authorEmail?: string;
  /** posts written by the Tembea team to start the feed */
  team?: boolean;
  placeId?: string;
  kind: "update" | "tip" | "question";
  text: string;
  /** data URL (uploaded) or Unsplash id (seed posts) */
  image?: string;
  likes: string[];
  comments: PostComment[];
  createdAt: number;
}

export type PostView = Omit<Post, "likes" | "authorEmail"> & { likeCount: number; liked: boolean; authorEmail?: string };

const day = 86_400_000;
const t0 = Date.UTC(2026, 9, 20);

/** Starter posts by the Tembea team (clearly labelled) so the feed isn't empty on day one. */
export const SEED_POSTS: Post[] = [
  {
    id: "seed-1",
    author: "Tembea team",
    team: true,
    placeId: "maasai-mara",
    kind: "tip",
    text: "Migration tip: river crossings at the Mara River usually peak from late July to September, but they're never guaranteed. Give yourself at least three full days in the reserve, ideally at a camp in the north of the reserve near the river.",
    image: IMG.maraMigration,
    likes: [],
    comments: [],
    createdAt: t0 - 2 * day,
  },
  {
    id: "seed-2",
    author: "Tembea team",
    team: true,
    placeId: "diani",
    kind: "tip",
    text: "Heading to Diani from Mombasa? The Likoni ferry is free for foot passengers and cheap for cars, but queues can be long at peak hours. The Dongo Kundu bypass avoids the ferry entirely if you're driving from the airport.",
    image: IMG.dianiPalms,
    likes: [],
    comments: [],
    createdAt: t0 - 1 * day,
  },
  {
    id: "seed-3",
    author: "Tembea team",
    team: true,
    kind: "question",
    text: "Welcome to the Tembea community. Share your journey updates, ask fellow travellers anything and tag the place you're at. Where are you heading next?",
    image: IMG.starrySavanna,
    likes: [],
    comments: [],
    createdAt: t0,
  },
];
