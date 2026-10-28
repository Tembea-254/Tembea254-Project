"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LoginModal } from "./login-modal";

interface LoginGate {
  /** Open the sign-in modal; after signing in the user lands on `callbackUrl`. */
  openLogin: (opts?: { callbackUrl?: string; reason?: string }) => void;
}

const Ctx = createContext<LoginGate>({ openLogin: () => {} });
export const useLoginGate = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; callbackUrl: string; reason?: string; error?: string }>({ open: false, callbackUrl: "/dashboard" });

  // NextAuth sends failed sign-ins back to "/?error=…" — reopen the modal and say what happened.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const code = q.get("error");
    if (!code) return;
    const callbackUrl = q.get("callbackUrl") || "/dashboard";
    q.delete("error");
    q.delete("callbackUrl");
    const rest = q.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash);
    setState({ open: true, callbackUrl: callbackUrl.startsWith("/") || callbackUrl.startsWith(window.location.origin) ? callbackUrl : "/dashboard", error: authErrorMessage(code) });
  }, []);
  const openLogin = useCallback((opts?: { callbackUrl?: string; reason?: string }) => {
    setState({ open: true, callbackUrl: opts?.callbackUrl || "/dashboard", reason: opts?.reason });
  }, []);
  return (
    <SessionProvider>
      <Ctx.Provider value={{ openLogin }}>
        {children}
        <LoginModal open={state.open} callbackUrl={state.callbackUrl} reason={state.reason} initialError={state.error} onClose={() => setState((s) => ({ ...s, open: false, error: undefined }))} />
      </Ctx.Provider>
    </SessionProvider>
  );
}

function authErrorMessage(code: string) {
  switch (code) {
    case "OAuthSignin":
    case "OAuthCallback":
    case "Callback":
      return "Google sign-in didn't finish. Please try again — if it keeps failing, sign up with email.";
    case "OAuthAccountNotLinked":
      return "This email is already registered with a different sign-in method. Use the one you signed up with.";
    case "AccessDenied":
      return "Sign-in was cancelled or not allowed for this account.";
    case "CredentialsSignin":
      return "That email and password don't match an account.";
    case "Configuration":
      return "Sign-in isn't set up correctly on the server yet. Please try email, or come back shortly.";
    default:
      return "Something went wrong while signing you in. Please try again.";
  }
}
