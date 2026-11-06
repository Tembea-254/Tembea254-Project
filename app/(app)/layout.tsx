import { Megaphone } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { workspaceAccess } from "@/lib/repo/workspaces";
import { currentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [banner, access] = await Promise.all([
    getSettings()
      .then((s) => s.maintenanceBanner?.trim())
      .catch(() => ""),
    currentUser()
      .then((u) => workspaceAccess(u))
      .catch(() => undefined),
  ]);
  return (
    <AppShell access={access}>
      {banner && (
        <p role="status" className="flex items-center justify-center gap-2 bg-ochre-400 px-4 py-2 text-center text-sm font-medium text-ink">
          <Megaphone className="h-4 w-4 shrink-0" /> {banner}
        </p>
      )}
      {children}
    </AppShell>
  );
}
