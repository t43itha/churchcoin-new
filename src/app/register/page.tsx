"use client";

import { SignUp } from "@clerk/nextjs";
import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function RegisterContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? "/dashboard";
  const inviteToken = searchParams?.get("invite") ?? undefined;

  const afterSignUpUrl = useMemo(() => {
    if (inviteToken) {
      const url = new URL(redirect, typeof window === "undefined" ? "https://local" : window.location.origin);
      url.searchParams.set("invite", inviteToken);
      return url.pathname + url.search;
    }
    return redirect;
  }, [redirect, inviteToken]);

  const signInUrl = useMemo(() => {
    const target = inviteToken
      ? `${redirect}${redirect.includes("?") ? "&" : "?"}invite=${encodeURIComponent(inviteToken)}`
      : redirect;
    return `/login?redirect=${encodeURIComponent(target)}`;
  }, [redirect, inviteToken]);

  return (
    <SignUp
      routing="hash"
      fallbackRedirectUrl={afterSignUpUrl}
      signInUrl={signInUrl}
    />
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <Suspense fallback={<div>Loading...</div>}>
        <RegisterContent />
      </Suspense>
    </div>
  );
}
