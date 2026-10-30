import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/blog-index";
import { getBlogPosts } from "@/lib/repo/blog";

export const metadata: Metadata = {
  title: "Blog — Kenya travel guides",
  description: "Practical Kenya travel guides from Tembea254: safaris, the coast, Nairobi, culture and getting around.",
};
export const revalidate = 60;

export default async function BlogPage() {
  return <BlogIndex posts={await getBlogPosts()} />;
}
