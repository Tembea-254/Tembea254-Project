import { promises as fs } from "fs";
import path from "path";

/**
 * Tiny JSON-file persistence in .data/ (git-ignored) for reviews, community posts,
 * vendor applications and orders. Fine for local development and demos; replace with
 * a real database (Postgres, Supabase, Firebase…) before production — the API routes
 * only call readJSON / writeJSON, so that's the only module to swap.
 */
const DIR = path.join(process.cwd(), ".data");

export async function readJSON<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON<T>(name: string, data: T) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, name), JSON.stringify(data, null, 2));
}

export const newId = (p = "") => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
