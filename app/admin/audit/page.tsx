import { desc } from "drizzle-orm";
import { DataTable, PageHeader, when } from "@/components/admin/kit";
import { getDb, schema as s } from "@/lib/db";

export const metadata = { title: "Activity log" };

export default async function AuditAdmin() {
  const db = await getDb();
  const rows = await db.select().from(s.auditLogs).orderBy(desc(s.auditLogs.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Activity log" text="Who did what in the control centre, newest first." />
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty="No admin activity yet."
        cols={[
          { label: "When", cell: (r) => when(r.createdAt) },
          { label: "Admin", cell: (r) => r.actorEmail },
          { label: "Action", cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
          { label: "Target", cell: (r) => <span className="font-mono text-xs text-ink-muted">{r.target ?? "—"}</span> },
        ]}
      />
    </>
  );
}
