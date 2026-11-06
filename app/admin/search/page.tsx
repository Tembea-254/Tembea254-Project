import Link from "next/link";
import { desc, ilike, or } from "drizzle-orm";
import { Package, Receipt, Search, Store, Users } from "lucide-react";
import { PageHeader, StatusBadge, kes, when } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";

export const metadata = { title: "Search" };

export default async function AdminSearch({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const db = await getDb();
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const [users, vendors, orders, products] = q
    ? await Promise.all([
        db.select().from(s.users).where(or(ilike(s.users.email, like), ilike(s.users.name, like), ilike(s.users.handle, like), ilike(s.users.phone, like))).orderBy(desc(s.users.createdAt)).limit(8),
        db.select().from(s.vendors).where(or(ilike(s.vendors.storeName, like), ilike(s.vendors.phone, like), ilike(s.vendors.location, like))).limit(8),
        db.select().from(s.orders).where(or(ilike(s.orders.id, like), ilike(s.orders.buyerName, like), ilike(s.orders.phone, like), ilike(s.orders.trackingNumber, like))).orderBy(desc(s.orders.createdAt)).limit(8),
        db.select().from(s.products).where(or(ilike(s.products.title, like), ilike(s.products.category, like))).limit(8),
      ])
    : [[], [], [], []];
  const total = users.length + vendors.length + orders.length + products.length;
  const groups = [
    {
      title: "Users",
      icon: Users,
      href: `/admin/users?q=${encodeURIComponent(q)}`,
      items: users.map((u) => ({ key: u.id, title: u.name || u.email, sub: `${u.email}${u.phone ? ` · ${u.phone}` : ""}`, badge: u.role === "admin" ? "admin" : u.status })),
    },
    {
      title: "Sellers",
      icon: Store,
      href: `/admin/shop?tab=vendors&q=${encodeURIComponent(q)}`,
      items: vendors.map((v) => ({ key: v.id, title: v.storeName, sub: `${v.location} · ${v.phone}`, badge: v.status })),
    },
    {
      title: "Orders",
      icon: Receipt,
      href: `/admin/shop?tab=orders&q=${encodeURIComponent(q)}`,
      items: orders.map((o) => ({ key: o.id, title: `${o.buyerName} · ${kes(o.total)}`, sub: `${o.id} · ${when(o.createdAt)}`, badge: o.status })),
    },
    {
      title: "Products & services",
      icon: Package,
      href: `/admin/shop?tab=products&q=${encodeURIComponent(q)}`,
      items: products.map((p) => ({ key: p.id, title: p.title, sub: `${kes(p.price)} · ${p.kind}`, badge: p.status })),
    },
  ];
  return (
    <>
      <PageHeader eyebrow="Search" title={q ? `Results for “${q}”` : "Search the control centre"} text={q ? `${total} match${total === 1 ? "" : "es"} across users, sellers, orders and products.` : "Type a name, email, phone number, store or order number in the search bar above."} />
      {q && !total && (
        <p className="flex items-center gap-2 rounded-3xl border border-dashed border-ink/15 bg-white/60 p-8 text-sm text-ink-muted">
          <Search className="h-4 w-4" /> Nothing found. Try part of an email, a phone number or an order number.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        {groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.title} className="rounded-3xl bg-white p-4 shadow-card sm:p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display font-bold">
                  <g.icon className="h-4 w-4 text-savanna-600" /> {g.title}
                </h2>
                <Link href={g.href} className="text-sm font-semibold text-savanna-600">
                  Open list
                </Link>
              </div>
              <ul className="divide-y divide-ink/[0.06]">
                {g.items.map((i) => (
                  <li key={i.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{i.title}</span>
                      <span className="block truncate text-xs text-ink-muted">{i.sub}</span>
                    </span>
                    <StatusBadge status={i.badge} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </>
  );
}
