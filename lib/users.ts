import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";

/**
 * Minimal email/password user store for local development and demos.
 * Users are kept in .data/users.json (git-ignored). Swap this module for a real
 * database (Postgres/Prisma, Supabase, Firebase) before going to production.
 */
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

const FILE = path.join(process.cwd(), ".data", "users.json");

async function readAll(): Promise<StoredUser[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as StoredUser[];
  } catch {
    return [];
  }
}

async function writeAll(users: StoredUser[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(users, null, 2));
}

export async function findUser(email: string) {
  const e = email.trim().toLowerCase();
  return (await readAll()).find((u) => u.email === e);
}

export async function createUser(name: string, email: string, password: string) {
  const users = await readAll();
  const e = email.trim().toLowerCase();
  if (users.some((u) => u.email === e)) throw new Error("EMAIL_TAKEN");
  const user: StoredUser = {
    id: "u_" + Math.random().toString(36).slice(2, 10),
    name: name.trim() || e.split("@")[0],
    email: e,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: Date.now(),
  };
  await writeAll([...users, user]);
  return user;
}

export async function verifyUser(email: string, password: string) {
  const user = await findUser(email);
  if (!user) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}
