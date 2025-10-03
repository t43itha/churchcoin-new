"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useSession } from "@/components/auth/session-provider";
import type { UserRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? "/dashboard";
  const inviteToken = searchParams?.get("invite");
  const { user, loading, refresh } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [churchName, setChurchName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<
    | {
        email: string;
        role: UserRole;
        churchName: string | null;
      }
    | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setInviteInfo(null);
      setInviteError(null);
      return;
    }

    let cancelled = false;
    setInviteError(null);

    (async () => {
      try {
        const response = await fetch(`/api/users/invites/${inviteToken}`);
        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: "" }));
          setInviteError(
            body.error ||
              "This invitation link is no longer valid. Contact your administrator for a new invite."
          );
          setInviteInfo(null);
          return;
        }

        const data = (await response.json()) as {
          invite: {
            email: string;
            role: UserRole;
            churchName: string | null;
          };
        };

        setInviteInfo(data.invite);
        setEmail(data.invite.email);
      } catch (fetchError) {
        console.error("Failed to load invite", fetchError);
        if (!cancelled) {
          setInviteError(
            "We could not verify this invitation. Please try again or request a new invite."
          );
          setInviteInfo(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const inviteRoleLabel = useMemo(() => {
    if (!inviteInfo) {
      return null;
    }

    switch (inviteInfo.role) {
      case "administrator":
        return "Administrator";
      case "finance":
        return "Finance team";
      case "pastorate":
        return "Pastorate";
      case "secured_guest":
        return "Secured guest access";
      default:
        return inviteInfo.role;
    }
  }, [inviteInfo]);

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

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        churchName: inviteToken ? undefined : churchName,
        inviteToken: inviteToken ?? undefined,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "" }));
      setError(body.error || "Unable to create your account.");
      setSubmitting(false);
      return;
    }

    await refresh();
    router.replace(redirect || "/dashboard");
  };

  const inviteLoading = inviteToken ? !inviteInfo && !inviteError : false;
  const disableSubmit = submitting || inviteLoading || Boolean(inviteError);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <Card className="w-full max-w-md border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-ink">Create your account</CardTitle>
          <CardDescription className="text-grey-mid">
            Start tracking funds and reconciling statements in minutes.
          </CardDescription>
        </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {inviteToken ? (
                <div className="rounded-md border border-highlight bg-highlight/20 px-3 py-2 text-sm text-ink">
                  <p>
                    You&apos;re joining {inviteInfo?.churchName ?? "this workspace"}
                    {inviteRoleLabel ? ` as ${inviteRoleLabel}.` : "."}
                  </p>
                  {inviteLoading ? (
                    <p className="mt-1 text-xs text-grey-mid">
                      Checking invitation details...
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-grey-mid">Name</label>
                <Input
                  type="text"
                  required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="font-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-grey-mid">Email</label>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={Boolean(inviteToken && inviteInfo)}
                  className="font-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-grey-mid">Password</label>
              <Input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="font-primary"
              />
            </div>
              {!inviteToken ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-grey-mid">
                    Church name (optional)
                  </label>
                  <Input
                    type="text"
                    value={churchName}
                    onChange={(event) => setChurchName(event.target.value)}
                    className="font-primary"
                    placeholder="Grace Fellowship"
                  />
                </div>
              ) : null}
              {error ? (
                <p className="rounded-md border border-error/40 bg-error/5 px-3 py-2 text-sm text-error">
                  {error}
                </p>
              ) : null}
              {inviteError ? (
                <p className="rounded-md border border-error/40 bg-error/5 px-3 py-2 text-sm text-error">
                  {inviteError}
                </p>
              ) : null}
              <Button
                type="submit"
                disabled={disableSubmit}
                className="w-full bg-ink text-paper hover:bg-ink/90"
              >
                {disableSubmit
                  ? inviteLoading
                    ? "Checking invitation..."
                    : submitting
                      ? "Creating account..."
                      : "Create account"
                  : "Create account"}
              </Button>
            </form>
          <p className="mt-6 text-center text-sm text-grey-mid">
            Already have an account? {" "}
            <Link className="text-ink underline" href="/login">
              Sign in instead
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function RegisterSuspenseFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <Card className="w-full max-w-md border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-ink">Loading</CardTitle>
          <CardDescription className="text-grey-mid">
            Preparing your registration experience...
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterSuspenseFallback />}>
      <RegisterPageContent />
    </Suspense>
  );
}
