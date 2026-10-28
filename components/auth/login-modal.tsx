"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, Sparkles, X } from "lucide-react";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "../shell/logo";
import { Button } from "../ui/button";
import { Input } from "../ui/primitives";
import { FacebookIcon, GoogleIcon } from "./brand-icons";

type Options = { google: boolean; facebook: boolean; demo: boolean };

export function LoginModal({ open, onClose, callbackUrl, reason }: { open: boolean; onClose: () => void; callbackUrl: string; reason?: string }) {
  const [view, setView] = useState<"social" | "signup" | "login">("social");
  const [opts, setOpts] = useState<Options | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNotice(null);
    setView("social");
    fetch("/api/auth/options")
      .then((r) => r.json())
      .then(setOpts)
      .catch(() => setOpts({ google: false, facebook: false, demo: true }));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const social = async (provider: "google" | "facebook") => {
    setError(null);
    if (opts && !opts[provider]) {
      setNotice(
        `${provider === "google" ? "Google" : "Facebook"} sign-in isn't switched on for this server yet. Add the ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET keys to .env.local (see README), or continue with email below.`,
      );
      return;
    }
    setBusy(provider);
    await signIn(provider, { callbackUrl });
  };

  const emailAuth = async () => {
    setError(null);
    setBusy("email");
    try {
      if (view === "signup") {
        const res = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Sign-up failed");
      }
      const r = await signIn("email", { email: form.email, password: form.password, redirect: false, callbackUrl });
      if (!r || r.error) throw new Error(view === "login" ? "That email and password don't match an account." : "Account created, but sign-in failed — try logging in.");
      window.location.href = callbackUrl;
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-night/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-[28px] bg-white p-6 shadow-lift sm:p-8"
          >
            <button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-ink/10 text-ink hover:bg-sand-50" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            {view !== "social" && (
              <button onClick={() => setView("social")} className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-sand-50" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <div className="flex flex-col items-center text-center">
              <LogoMark className="h-16 w-16 shadow-card" />
              <h2 id="login-title" className="mt-4 text-2xl font-bold">
                {view === "login" ? "Welcome back" : reason ? reason : "Create a free account to plan with AI"}
              </h2>
              <p className="mt-1.5 text-sm text-ink-muted">Trips, virtual previews and translations — saved to your account.</p>
            </div>

            {view === "social" ? (
              <div className="mt-6 space-y-3">
                <SocialButton onClick={() => social("google")} busy={busy === "google"} icon={<GoogleIcon />}>
                  Continue with Google
                </SocialButton>
                <SocialButton onClick={() => social("facebook")} busy={busy === "facebook"} icon={<FacebookIcon />}>
                  Continue with Facebook
                </SocialButton>
                {notice && <p className="rounded-2xl bg-ochre-50 p-3 text-left text-xs leading-relaxed text-ochre-600">{notice}</p>}
                <Divider />
                <Button variant="outline" size="lg" className="w-full" onClick={() => setView("signup")}>
                  <Mail className="h-5 w-5" /> Sign up with email
                </Button>
                <p className="pt-1 text-center text-sm text-ink-soft">
                  Already have an account?{" "}
                  <button className="font-semibold text-savanna-600 hover:underline" onClick={() => setView("login")}>
                    Log in here
                  </button>
                </p>
                {opts?.demo && (
                  <button
                    onClick={async () => {
                      setBusy("demo");
                      await signIn("demo", { callbackUrl });
                    }}
                    className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    {busy === "demo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Explore with a demo account
                  </button>
                )}
              </div>
            ) : (
              <form
                className="mt-6 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  emailAuth();
                }}
              >
                {view === "signup" && (
                  <div className="grid grid-cols-1 gap-3">
                    <Input placeholder="Full name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 rounded-2xl" />
                  </div>
                )}
                <Input type="email" required placeholder="Email address" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12 rounded-2xl" />
                <Input
                  type="password"
                  required
                  minLength={view === "signup" ? 8 : 1}
                  placeholder={view === "signup" ? "Password (8+ characters)" : "Password"}
                  autoComplete={view === "signup" ? "new-password" : "current-password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="h-12 rounded-2xl"
                />
                {error && <p className="text-sm text-maasai-600">{error}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={busy === "email"}>
                  {busy === "email" && <Loader2 className="h-5 w-5 animate-spin" />}
                  {view === "signup" ? "Create account" : "Log in"}
                </Button>
                <p className="text-center text-sm text-ink-soft">
                  {view === "signup" ? "Already have an account? " : "New to Tembea254? "}
                  <button type="button" className="font-semibold text-savanna-600 hover:underline" onClick={() => setView(view === "signup" ? "login" : "signup")}>
                    {view === "signup" ? "Log in here" : "Create an account"}
                  </button>
                </p>
              </form>
            )}

            <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-muted">
              By continuing you agree to the Terms & Conditions and Privacy Policy of Tembea254. We&apos;ll never post to your social accounts.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SocialButton({ children, icon, onClick, busy }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-ink/10 bg-white font-display text-[15px] font-semibold text-ink transition-all hover:border-ink/25 hover:shadow-card active:scale-[0.99] disabled:opacity-70",
      )}
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-ink-muted">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-savanna-200" />
      or
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-savanna-200" />
    </div>
  );
}
