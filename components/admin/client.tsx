"use client";

import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { prepareImage, uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

type Tone = "primary" | "dark" | "outline" | "danger" | "soft";
const TONES: Record<Tone, string> = {
  primary: "bg-savanna-500 text-white hover:bg-savanna-600",
  dark: "bg-ink text-white hover:bg-ink/90",
  outline: "border border-ink/15 bg-white text-ink hover:bg-sand-50",
  danger: "bg-maasai-50 text-maasai-600 hover:bg-maasai-100",
  soft: "bg-savanna-50 text-savanna-700 hover:bg-savanna-100",
};

/** Submit button that shows a spinner while its form's server action runs. */
export function Submit({ children, tone = "primary", className, confirm, name, value, small }: { children: React.ReactNode; tone?: Tone; className?: string; confirm?: string; name?: string; value?: string; small?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-display font-semibold transition-colors disabled:opacity-60",
        small ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        TONES[tone],
        className,
      )}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

/** A file picker that uploads straight away and stores the URL in a hidden input of the same form. */
export function UploadField({ name, accept = "image/*", defaultValue, label = "Upload", multiple }: { name: string; accept?: string; defaultValue?: string; label?: string; multiple?: boolean }) {
  const [urls, setUrls] = useState<string[]>(defaultValue ? defaultValue.split("\n").filter(Boolean) : []);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <input type="hidden" name={name} value={urls.join("\n")} />
      <div className="flex flex-wrap items-center gap-2">
        {urls.map((u) => (
          <span key={u} className="relative">
            {/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u) ? (
              <video src={u} className="h-16 w-24 rounded-xl bg-ink object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={/^(https?:|\/)/.test(u) ? u : `https://images.unsplash.com/${u}?w=200&q=60`} alt="" className="h-16 w-16 rounded-xl object-cover" />
            )}
            <button type="button" onClick={() => setUrls(urls.filter((x) => x !== u))} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-white" aria-label="Remove">
              ×
            </button>
          </span>
        ))}
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-ink/25 bg-white px-4 text-sm font-medium hover:border-savanna-500">
          {busy != null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy != null ? `${busy}%` : label}
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            hidden
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              setError(null);
              for (const f of files) {
                try {
                  setBusy(0);
                  const url = await uploadFile(await prepareImage(f), setBusy);
                  setUrls((prev) => (multiple ? [...prev, url] : [url]));
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(null);
                }
              }
            }}
          />
        </label>
      </div>
      {error && <p className="mt-1 text-xs text-maasai-600">{error}</p>}
    </div>
  );
}
