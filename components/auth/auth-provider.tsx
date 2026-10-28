"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useCallback, useContext, useState } from "react";
import { LoginModal } from "./login-modal";

interface LoginGate {
  /** Open the sign-in modal; after signing in the user lands on `callbackUrl`. */
  openLogin: (opts?: { callbackUrl?: string; reason?: string }) => void;
}

const Ctx = createContext<LoginGate>({ openLogin: () => {} });
export const useLoginGate = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; callbackUrl: string; reason?: string }>({ open: false, callbackUrl: "/dashboard" });
  const openLogin = useCallback((opts?: { callbackUrl?: string; reason?: string }) => {
    setState({ open: true, callbackUrl: opts?.callbackUrl || "/dashboard", reason: opts?.reason });
  }, []);
  return (
    <SessionProvider>
      <Ctx.Provider value={{ openLogin }}>
        {children}
        <LoginModal open={state.open} callbackUrl={state.callbackUrl} reason={state.reason} onClose={() => setState((s) => ({ ...s, open: false }))} />
      </Ctx.Provider>
    </SessionProvider>
  );
}
