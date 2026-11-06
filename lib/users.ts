import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { newId } from "./db/ids";

export type StoredUser = typeof schema.users.$inferSelect;

/** Emails that are always admins (comma-separated in ADMIN_EMAILS). The owner is the first admin. */
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "piusdenistech@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const norm = (email: string) => email.trim().toLowerCase();

export async function findUser(email: string): Promise<StoredUser | undefined> {
  const db = await getDb();
  return (await db.select().from(schema.users).where(eq(schema.users.email, norm(email))))[0];
}

export async function getUserById(id: string): Promise<StoredUser | undefined> {
  const db = await getDb();
  return (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0];
}

export async function createUser(name: string, email: string, password: string) {
  const db = await getDb();
  const e = norm(email);
  const rows = await db
    .insert(schema.users)
    .values({
      id: newId("u_"),
      email: e,
      name: name.trim() || e.split("@")[0],
      passwordHash: await bcrypt.hash(password, 10),
      provider: "email",
      role: ADMIN_EMAILS.includes(e) ? "admin" : "user",
    })
    .onConflictDoNothing()
    .returning();
  if (!rows[0]) throw new Error("EMAIL_TAKEN");
  return rows[0];
}

export async function verifyUser(email: string, password: string) {
  const user = await findUser(email);
  if (!user?.passwordHash) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}

/** Create or update a user who signed in with Google/Facebook/demo. */
export async function upsertOAuthUser(p: { email: string; name?: string | null; image?: string | null; provider: string }) {
  const db = await getDb();
  const e = norm(p.email);
  const existing = await findUser(e);
  if (existing) {
    await db
      .update(schema.users)
      .set({
        name: existing.name || p.name || e.split("@")[0],
        image: p.image ?? existing.image,
        lastSeenAt: new Date(),
        role: ADMIN_EMAILS.includes(e) ? "admin" : existing.role,
      })
      .where(eq(schema.users.id, existing.id));
    return { ...existing, role: ADMIN_EMAILS.includes(e) ? "admin" : existing.role };
  }
  const rows = await db
    .insert(schema.users)
    .values({ id: newId("u_"), email: e, name: p.name || e.split("@")[0], image: p.image ?? null, provider: p.provider, role: ADMIN_EMAILS.includes(e) ? "admin" : "user" })
    .onConflictDoUpdate({ target: schema.users.email, set: { lastSeenAt: sql`now()` } })
    .returning();
  return rows[0];
}

/** Public @handle for community profiles — made from the name the first time it's needed. */
export async function ensureHandle(u: { id: string; name: string; email: string; handle?: string | null }) {
  if (u.handle) return u.handle;
  const db = await getDb();
  const base =
    (u.name || u.email.split("@")[0])
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 16) || "traveller";
  for (let i = 0; i < 6; i++) {
    const h = i ? `${base}${Math.floor(Math.random() * 9000 + 100)}` : base;
    const taken = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.handle, h));
    if (!taken.length) {
      await db.update(schema.users).set({ handle: h }).where(eq(schema.users.id, u.id));
      return h;
    }
  }
  return u.id;
}
