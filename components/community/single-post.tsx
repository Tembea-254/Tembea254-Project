"use client";

import { useLoginGate } from "../auth/auth-provider";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { FeedPost } from "@/lib/repo/community";
import { useFlash } from "./hub";
import { PostCard, useFeedActions } from "./post-card";

export function SinglePost({ post: initial }: { post: FeedPost }) {
  const [post, setPost] = useState(initial);
  const { data } = useSession();
  const { openLogin } = useLoginGate();
  const { flash, toast } = useFlash();
  const router = useRouter();
  const run = useFeedActions(!!data?.user, () => openLogin({ callbackUrl: `/community/p/${post.id}` }), flash);
  return (
    <>
      <PostCard post={post} run={run} flash={flash} onChange={(p) => setPost((x) => ({ ...x, ...p }))} onRemove={() => router.push("/community")} />
      {toast}
    </>
  );
}
