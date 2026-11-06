import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { findUser, getUserById, type StoredUser } from "./users";

/** The signed-in user from the database, or null. */
export async function currentUser(): Promise<StoredUser | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  const u = (await getUserById(id)) ?? (session?.user?.email ? await findUser(session.user.email) : undefined);
  if (!u || u.status === "suspended") return null;
  return u;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Please sign in first.");
  return u;
}

export async function requireAdmin() {
  const u = await currentUser();
  if (!u || u.role !== "admin") throw new HttpError(403, "Admins only.");
  return u;
}
