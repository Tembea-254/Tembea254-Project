import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotifyButton } from "./notify-button";
import { Badge, Card } from "../ui/primitives";

export function ComingSoonHero({
  eyebrow,
  title,
  text,
  icon: Icon,
  tone,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  icon: typeof Bell;
  tone: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="container-page py-8 sm:py-10">
      <Card className="relative overflow-hidden p-6 sm:p-10">
        <div className={cn("absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl", tone)} />
        <div className="relative max-w-2xl">
          <Badge tone="ochre">Coming soon</Badge>
          <span className={cn("mt-5 grid h-14 w-14 place-items-center rounded-2xl text-white", tone)}>
            <Icon className="h-7 w-7" />
          </span>
          <p className="eyebrow mt-5">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-3 text-ink-soft sm:text-lg">{text}</p>
          <NotifyButton />
        </div>
      </Card>
      {children}
    </div>
  );
}

export function PreviewCard({ title, text, icon: Icon, tag }: { title: string; text: string; icon: typeof Bell; tag?: string }) {
  return (
    <Card className="relative p-5">
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sand-100 text-ink-soft">
          <Icon className="h-5 w-5" />
        </span>
        {tag && <Badge tone="neutral">{tag}</Badge>}
      </div>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{text}</p>
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </Card>
  );
}
