"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useSession } from "./session-provider";

function AuthGuardContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectedRef = useRef(false);

  useEffect(() => {
    // Not loading and no user - redirect to login
    if (!loading && !user && !redirectedRef.current) {
      redirectedRef.current = true;
      const search = new URLSearchParams();
      if (pathname && pathname !== "/") {
        search.set("redirect", pathname);
      }
      router.replace(`/login${search.toString() ? `?${search.toString()}` : ""}`);
      return;
    }

    // User exists - check onboarding status
    if (!loading && user && !redirectedRef.current) {
      const needsOnboarding =
        user.onboardingStatus === "pending" ||
        user.onboardingStatus === "in_progress" ||
        // Users without a church and no explicit status need onboarding
        (!user.churchId && !user.onboardingStatus);

      const isOnboardingPath = pathname?.startsWith("/onboarding");

      // Redirect to onboarding if needed and not already there
      if (needsOnboarding && !isOnboardingPath) {
        redirectedRef.current = true;
        // Preserve invite token in URL if present
        const inviteToken = searchParams?.get("invite");
        const url = inviteToken
          ? `/onboarding?invite=${inviteToken}`
          : "/onboarding";
        router.replace(url);
      }
    }
  }, [loading, user, pathname, router, searchParams]);

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

export function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper text-grey-mid">
          Checking your access…
        </div>
      }
    >
      <AuthGuardContent>{children}</AuthGuardContent>
    </Suspense>
  );
}
