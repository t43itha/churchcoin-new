"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useSession } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? "/dashboard";
  const { user, loading, refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirect || "/dashboard");
    }
  }, [loading, user, redirect, router]);

  if (!loading && user) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "" }));
      setError(body.error || "Unable to sign in. Please check your details.");
      setSubmitting(false);
      return;
    }

    await refresh();
    router.replace(redirect || "/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <Card className="w-full max-w-md border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-ink">Welcome back</CardTitle>
          <CardDescription className="text-grey-mid">
            Sign in to continue managing your church finances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-grey-mid">Email</label>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="font-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-grey-mid">Password</label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="font-primary"
              />
            </div>
            {error ? (
              <p className="rounded-md border border-error/40 bg-error/5 px-3 py-2 text-sm text-error">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-ink text-paper hover:bg-ink/90"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-grey-mid">
            Need an account? {" "}
            <Link className="text-ink underline" href="/register">
              Create one now
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginSuspenseFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <Card className="w-full max-w-md border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-ink">Loading</CardTitle>
          <CardDescription className="text-grey-mid">
            Preparing your sign in experience...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-10 rounded-md bg-grey-light" />
            <div className="h-10 rounded-md bg-grey-light" />
            <div className="h-12 rounded-md bg-grey-light" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
