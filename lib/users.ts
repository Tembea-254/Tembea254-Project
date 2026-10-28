import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { StorageNotConfigured, ephemeralFs, kv, kvEnabled } from "./kv";

/**
 * Email/password accounts.
 * Production: one Redis key per user (`user:<email>`), created atomically so two sign-ups
 * with the same email can't both succeed. Local dev without Redis: .data/users.json.
 */
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

const FILE = path.join(process.cwd(), ".data", "users.json");
const key = (email: string) => `user:${email}`;
const norm = (email: string) => email.trim().toLowerCase();

async function readFileUsers(): Promise<StoredUser[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as StoredUser[];
  } catch {
    return [];
  }
}

export async function findUser(email: string): Promise<StoredUser | undefined> {
  const e = norm(email);
  if (kvEnabled) return (await kv.get<StoredUser>(key(e))) ?? undefined;
  return (await readFileUsers()).find((u) => u.email === e);
}

export async function createUser(name: string, email: string, password: string) {
  const e = norm(email);
  const user: StoredUser = {
    id: "u_" + Math.random().toString(36).slice(2, 10),
    name: name.trim() || e.split("@")[0],
    email: e,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: Date.now(),
  };
  if (kvEnabled) {
    if (!(await kv.setNX(key(e), user))) throw new Error("EMAIL_TAKEN");
    return user;
  }
  if (ephemeralFs) {
    console.error("[auth] Sign-up needs a database on this host — add Upstash Redis in Vercel → Storage (KV_REST_API_URL / KV_REST_API_TOKEN).");
    throw new StorageNotConfigured();
  }
  const users = await readFileUsers();
  if (users.some((u) => u.email === e)) throw new Error("EMAIL_TAKEN");
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify([...users, user], null, 2));
  return user;
}

export async function verifyUser(email: string, password: string) {
  const user = await findUser(email);
  if (!user) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}
