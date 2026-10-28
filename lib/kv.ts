/**
 * Durable key-value storage.
 *
 * - On Vercel (or anywhere) with an Upstash Redis database connected, data lives in Redis.
 *   Vercel → Storage → "Upstash for Redis" adds KV_REST_API_URL / KV_REST_API_TOKEN automatically;
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN work too.
 * - Locally without those keys, data falls back to JSON files in .data/ (git-ignored).
 *
 * Vercel's file system is read-only and wiped between requests, so files can never be used there.
 */

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const kvEnabled = !!(URL_ && TOKEN);
/** true when running on a serverless host where local files don't persist */
export const ephemeralFs = !!process.env.VERCEL || !!process.env.NETLIFY || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

export class StorageNotConfigured extends Error {
  constructor() {
    super("STORAGE_NOT_CONFIGURED");
  }
}

async function cmd<T>(...args: (string | number)[]): Promise<T> {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const data = (await r.json()) as { result?: T; error?: string };
  if (!r.ok || data.error) throw new Error(`Redis error: ${data.error || r.status}`);
  return data.result as T;
}

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    const v = await cmd<string | null>("GET", key);
    return v == null ? null : (JSON.parse(v) as T);
  },
  async set(key: string, value: unknown) {
    await cmd("SET", key, JSON.stringify(value));
  },
  /** set only if the key doesn't exist yet; returns false when it already existed */
  async setNX(key: string, value: unknown) {
    return (await cmd<string | null>("SET", key, JSON.stringify(value), "NX")) === "OK";
  },
};
