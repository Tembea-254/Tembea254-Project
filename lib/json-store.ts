import { promises as fs } from "fs";
import path from "path";
import { StorageNotConfigured, ephemeralFs, kv, kvEnabled } from "./kv";

/**
 * Small JSON documents (reviews, community posts, hire requests, provider applications).
 * Stored in Redis when it's connected (production), else in .data/*.json (local dev).
 */
const DIR = path.join(process.cwd(), ".data");

export async function readJSON<T>(name: string, fallback: T): Promise<T> {
  if (kvEnabled) {
    try {
      return (await kv.get<T>(`json:${name}`)) ?? fallback;
    } catch (e) {
      console.error("[storage] read failed", name, e);
      return fallback;
    }
  }
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON<T>(name: string, data: T) {
  if (kvEnabled) return kv.set(`json:${name}`, data);
  if (ephemeralFs) {
    console.error("[storage] No database connected — add Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN) in Vercel → Storage.");
    throw new StorageNotConfigured();
  }
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, name), JSON.stringify(data, null, 2));
}

export const newId = (p = "") => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
