import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="font-display text-7xl font-bold text-savanna-500">404</p>
        <h1 className="mt-3 text-2xl font-bold">Looks like this trail went cold</h1>
        <p className="mt-2 text-ink-muted">Even the best guides take a wrong turn sometimes.</p>
        <Link href="/" className={buttonVariants({ className: "mt-6" })}>
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
