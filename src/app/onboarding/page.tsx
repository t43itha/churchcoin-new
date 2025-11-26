"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";

function OnboardingRouter() {
  const { user, loading } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteToken = searchParams?.get("invite");

  useEffect(() => {
    if (loading) return;

    // Not authenticated - redirect to login
    if (!user) {
      router.replace("/login");
      return;
    }

    // Already completed onboarding - go to dashboard
    if (user.onboardingStatus === "completed") {
      router.replace("/dashboard");
      return;
    }

    // Determine flow type based on invite token and church assignment
    if (inviteToken || user.churchId) {
      // Has invite token or already assigned to a church = invited flow
      const url = inviteToken
        ? `/onboarding/invited/1?invite=${inviteToken}`
        : "/onboarding/invited/1";
      router.replace(url);
    } else {
      // No invite and no church = new church flow
      router.replace("/onboarding/new-church/1");
    }
  }, [loading, user, inviteToken, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ledger border-t-ink mx-auto" />
        <p className="text-grey-mid font-primary">
          Setting up your experience...
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ledger border-t-ink mx-auto" />
            <p className="text-grey-mid font-primary">Loading...</p>
          </div>
        </div>
      }
    >
      <OnboardingRouter />
    </Suspense>
  );
}
