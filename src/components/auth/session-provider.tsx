"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { Doc } from "@/lib/convexGenerated";

export type SessionUser = Doc<"users"> | null;

type SessionState = {
  user: SessionUser;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | undefined>(undefined);

async function fetchSession() {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load session");
  }

  return (await response.json()) as {
    user?: SessionUser;
    session?: { expires: number } | null;
  };
}

async function requestLogout() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSession();
      setUser(data.user ?? null);
    } catch (error) {
      console.error("Failed to refresh session", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await requestLogout();
    setUser(null);
  }, []);

  useEffect(() => {
    refresh().catch((error) => {
      console.error("Initial session load failed", error);
    });
  }, [refresh]);

  const value = useMemo<SessionState>(
    () => ({
      user,
      loading,
      refresh,
      signOut,
    }),
    [user, loading, refresh, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
