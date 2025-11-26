"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function InvitedRouter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams?.get("invite");

  useEffect(() => {
    const url = inviteToken
      ? `/onboarding/invited/1?invite=${inviteToken}`
      : "/onboarding/invited/1";
    router.replace(url);
  }, [router, inviteToken]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ledger border-t-ink" />
    </div>
  );
}

export default function InvitedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ledger border-t-ink" />
        </div>
      }
    >
      <InvitedRouter />
    </Suspense>
  );
}
