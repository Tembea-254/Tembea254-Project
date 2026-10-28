import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/blog-index";

export const metadata: Metadata = {
  title: "Blog — Kenya travel guides",
  description: "Practical Kenya travel guides from Tembea254: safaris, the coast, Nairobi, culture and getting around.",
};

export default function BlogPage() {
  return <BlogIndex />;
}
