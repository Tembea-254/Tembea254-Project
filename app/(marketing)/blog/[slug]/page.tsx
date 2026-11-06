import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/blog-article";
import { getBlogPost, getBlogPosts } from "@/lib/repo/blog";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getBlogPost(params.slug);
  return p ? { title: p.title, description: p.excerpt } : { title: "Blog" };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const all = await getBlogPosts();
  const post = all.find((p) => p.slug === params.slug);
  if (!post) notFound();
  return <BlogArticle post={post} more={all.filter((x) => x.slug !== post.slug).slice(0, 3)} />;
}
