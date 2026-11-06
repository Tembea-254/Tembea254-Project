import { desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "../db";

export type SellerAccess = "none" | "pending" | "verified" | "suspended" | "rejected";
export type CreatorAccess = "none" | "pending" | "approved" | "rejected";
export interface WorkspaceAccess {
  seller: SellerAccess;
  creator: CreatorAccess;
  admin: boolean;
  /** admin's note when an application was turned down */
  sellerNote?: string | null;
  creatorNote?: string | null;
}

export const NO_ACCESS: WorkspaceAccess = { seller: "none", creator: "none", admin: false };

/**
 * What a user may open in the sidebar. Seller centre and Creator studio only appear
 * after an admin has approved the user's application.
 */
export async function workspaceAccess(user: { id: string; role?: string } | null | undefined): Promise<WorkspaceAccess> {
  if (!user) return NO_ACCESS;
  try {
    const db = await getDb();
    const [vendor, creatorApp, legacy] = await Promise.all([
      db.select({ status: s.vendors.status, note: s.vendors.note }).from(s.vendors).where(eq(s.vendors.userId, user.id)).limit(1),
      db
        .select({ status: s.applications.status, note: s.applications.note, kind: s.applications.kind })
        .from(s.applications)
        .where(eq(s.applications.userId, user.id))
        .orderBy(desc(s.applications.createdAt)),
      // creators who already sold videos before applications existed keep their studio
      db.select({ id: s.videoSubmissions.id }).from(s.videoSubmissions).where(eq(s.videoSubmissions.userId, user.id)).limit(1),
    ]);
    const app = creatorApp.find((a) => a.kind === "creator");
    let creator: CreatorAccess = app ? (app.status as CreatorAccess) : "none";
    if (creator !== "approved" && legacy.length && (!app || app.status !== "rejected")) creator = "approved";
    const v = vendor[0];
    return {
      seller: v ? (v.status as SellerAccess) : "none",
      creator,
      admin: user.role === "admin",
      sellerNote: v?.status === "rejected" && v.note !== "demo" ? v.note : null,
      creatorNote: app?.status === "rejected" ? app.note : null,
    };
  } catch (e) {
    console.error("[workspaceAccess]", e);
    return { ...NO_ACCESS, admin: user.role === "admin" };
  }
}

export const canSell = (a: WorkspaceAccess) => a.seller === "verified" || a.seller === "suspended";
export const canCreate = (a: WorkspaceAccess) => a.creator === "approved" || a.admin;
