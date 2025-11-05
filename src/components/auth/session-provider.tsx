"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";

import type { Doc } from "@/lib/convexGenerated";
import { resolveUserRole } from "@/lib/rbac";

export type SessionUser = Doc<"users"> | null;

type SessionState = {
  user: SessionUser;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | undefined>(undefined);

async function fetchSession(inviteToken?: string | null) {
  const url = new URL("/api/auth/session", window.location.origin);
  if (inviteToken) {
    url.searchParams.set("invite", inviteToken);
  }
  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load session");
  }

  return (await response.json()) as {
    user?: SessionUser;
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut: clerkSignOut } = useClerk();
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const inviteFromUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("invite")
          : null;
      const data = await fetchSession(inviteFromUrl);
      const normalizedUser = data.user
        ? ({ ...data.user, role: resolveUserRole(data.user.role) } as SessionUser)
        : null;
      setUser(normalizedUser);
    } catch (error) {
      console.error("Failed to refresh session", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const signOut = useCallback(async () => {
    await clerkSignOut();
    setUser(null);
  }, [clerkSignOut]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setUser(null);
      setLoading(false);
      return;
    }

    refresh().catch((error) => {
      console.error("Initial session load failed", error);
    });
  }, [isLoaded, isSignedIn, refresh]);

  const value = useMemo<SessionState>(
    () => ({
      user,
      loading: loading || !isLoaded,
      refresh,
      signOut,
    }),
    [user, loading, isLoaded, refresh, signOut]
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
