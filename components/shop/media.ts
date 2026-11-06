/** Product/store images can be uploads (absolute URLs) or Unsplash photo ids. */
export function mediaUrl(u: string | null | undefined, w = 800, h?: number) {
  if (!u) return "";
  if (/^(https?:)?\/\//.test(u) || u.startsWith("/")) return u;
  return `https://images.unsplash.com/${u}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=72`;
}
