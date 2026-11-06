import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { setUserRole, setUserStatus, adjustUserTokens } from "../actions";
import { Submit } from "@/components/admin/client";
import { DataTable, FilterTabs, PageHeader, SearchBox, StatusBadge, day, inputCls } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";

export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: { q?: string; role?: string } }) {
  const db = await getDb();
  const q = (searchParams.q || "").trim();
  const role = searchParams.role || "";
  const where: SQL[] = [sql`${s.users.provider} <> 'system'`];
  if (q) where.push(or(ilike(s.users.email, `%${q}%`), ilike(s.users.name, `%${q}%`))!);
  if (role === "admin") where.push(eq(s.users.role, "admin"));
  if (role === "suspended") where.push(eq(s.users.status, "suspended"));
  const rows = await db
    .select({
      u: s.users,
      trips: sql<number>`(select count(*)::int from ${s.trips} t where t.user_id = ${s.users.id})`,
      vendor: sql<string | null>`(select v.status from ${s.vendors} v where v.user_id = ${s.users.id})`,
    })
    .from(s.users)
    .where(and(...where))
    .orderBy(desc(s.users.createdAt))
    .limit(200);

  return (
    <>
      <PageHeader title="Users & roles" text="Everyone with an account. Make admins, suspend accounts and give or take reward tokens." />
      <SearchBox action="/admin/users" value={q} placeholder="Search name or email" hidden={role ? { role } : undefined} />
      <FilterTabs
        base="/admin/users"
        param="role"
        value={role}
        options={[
          { value: "", label: "Everyone" },
          { value: "admin", label: "Admins" },
          { value: "suspended", label: "Suspended" },
        ]}
      />
      <DataTable
        rows={rows}
        rowKey={(r) => r.u.id}
        empty="No users match."
        cols={[
          {
            label: "User",
            cell: ({ u }) => (
              <div className="min-w-0">
                <p className="truncate font-medium">{u.name || "—"}</p>
                <p className="truncate text-xs text-ink-muted">{u.email}</p>
              </div>
            ),
          },
          { label: "Sign-in", cell: ({ u }) => <span className="capitalize text-ink-soft">{u.provider}</span>, hideSm: true },
          {
            label: "Role",
            cell: ({ u, vendor }) => (
              <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                <StatusBadge status={u.role === "admin" ? "admin" : "visible"} label={u.role === "admin" ? "Admin" : "Traveller"} />
                {vendor && <StatusBadge status={vendor} label={`Vendor · ${vendor}`} />}
                {u.status === "suspended" && <StatusBadge status="suspended" />}
              </span>
            ),
          },
          { label: "Trips", cell: (r) => r.trips, hideSm: true },
          { label: "Tokens", cell: ({ u }) => <span className="font-display font-semibold">{u.tokens}</span> },
          { label: "Joined", cell: ({ u }) => day(u.createdAt), hideSm: true },
          {
            label: "Actions",
            cell: ({ u }) => (
              <div className="flex flex-wrap justify-end gap-1.5 md:justify-start">
                <form action={setUserRole}>
                  <input type="hidden" name="id" value={u.id} />
                  <Submit small tone={u.role === "admin" ? "outline" : "dark"} name="role" value={u.role === "admin" ? "user" : "admin"} confirm={u.role === "admin" ? `Remove admin from ${u.email}?` : `Make ${u.email} an admin? They will be able to manage everything.`}>
                    {u.role === "admin" ? "Remove admin" : "Make admin"}
                  </Submit>
                </form>
                <form action={setUserStatus}>
                  <input type="hidden" name="id" value={u.id} />
                  <Submit small tone={u.status === "suspended" ? "soft" : "danger"} name="status" value={u.status === "suspended" ? "active" : "suspended"} confirm={u.status === "suspended" ? undefined : `Suspend ${u.email}? They won't be able to sign in.`}>
                    {u.status === "suspended" ? "Reactivate" : "Suspend"}
                  </Submit>
                </form>
                <details className="relative">
                  <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-full border border-ink/15 px-3 font-display text-xs font-semibold">Tokens</summary>
                  <form action={adjustUserTokens} className="absolute right-0 z-20 mt-1 w-64 space-y-2 rounded-2xl bg-white p-3 text-left shadow-lift ring-1 ring-ink/10">
                    <input type="hidden" name="id" value={u.id} />
                    <input name="amount" type="number" placeholder="+100 or -50" className={inputCls} aria-label="Token change" />
                    <input name="reason" placeholder="Reason" className={inputCls} aria-label="Reason" />
                    <input name="credits" type="number" min={0} placeholder={`Planner credits (now ${u.credits})`} className={inputCls} aria-label="Planner credits" />
                    <Submit small className="w-full">
                      Save
                    </Submit>
                  </form>
                </details>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
