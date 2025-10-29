"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <SignIn routing="path" path="/login" afterSignInUrl={redirect} />
    </div>
  );
}
