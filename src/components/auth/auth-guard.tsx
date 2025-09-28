"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useSession } from "./session-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user && !redirectedRef.current) {
      redirectedRef.current = true;
      const search = new URLSearchParams();
      if (pathname && pathname !== "/") {
        search.set("redirect", pathname);
      }
      router.replace(`/login${search.toString() ? `?${search.toString()}` : ""}`);
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-grey-mid">
        Checking your access…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
