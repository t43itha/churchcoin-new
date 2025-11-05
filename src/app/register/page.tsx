"use client";

import { SignUp } from "@clerk/nextjs";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

export default function RegisterPage() {
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
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <SignUp
        routing="hash"
        fallbackRedirectUrl={afterSignUpUrl}
        signInUrl={signInUrl}
      />
    </div>
  );
}
