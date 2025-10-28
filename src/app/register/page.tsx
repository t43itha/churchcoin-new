"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  SignInButton,
  SignUp,
  SignedIn,
  SignedOut,
  useAuth,
} from "@clerk/nextjs";

import type { UserRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function InviteDetails({
  invite,
  loading,
  error,
}: {
  invite: { email: string; role: UserRole; churchName: string | null } | null;
  loading: boolean;
  error: string | null;
}) {
  const inviteRoleLabel = useMemo(() => {
    if (!invite) {
      return null;
    }

    switch (invite.role) {
      case "administrator":
        return "Administrator";
      case "finance":
        return "Finance team";
      case "pastorate":
        return "Pastorate";
      case "secured_guest":
        return "Secured guest access";
      default:
        return invite.role;
    }
  }, [invite]);

  if (loading) {
    return (
      <div className="rounded-md border border-ledger bg-ledger/30 px-3 py-2 text-sm text-grey-mid">
        Checking invitation details…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-error/40 bg-error/5 px-3 py-2 text-sm text-error">
        {error}
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  return (
    <div className="rounded-md border border-highlight bg-highlight/20 px-3 py-2 text-sm text-ink">
      <p>
        You&apos;re joining {invite.churchName ?? "this workspace"}
        {inviteRoleLabel ? ` as ${inviteRoleLabel}.` : "."}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? "/dashboard";
  const inviteToken = searchParams?.get("invite") ?? null;
  const { isLoaded, isSignedIn } = useAuth();
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    role: UserRole;
    churchName: string | null;
  } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setInviteInfo(null);
      setInviteError(null);
      setInviteLoading(false);
      return;
    }

    let cancelled = false;
    setInviteLoading(true);
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
          invite: { email: string; role: UserRole; churchName: string | null };
        };

        setInviteInfo(data.invite);
      } catch (error) {
        console.error("Failed to load invite", error);
        if (!cancelled) {
          setInviteError(
            "We could not verify this invitation. Please try again or request a new invite."
          );
          setInviteInfo(null);
        }
      } finally {
        if (!cancelled) {
          setInviteLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace(redirect || "/dashboard");
    }
  }, [isLoaded, isSignedIn, redirect, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <Card className="w-full max-w-md border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-ink">
            Create your account
          </CardTitle>
          <CardDescription className="text-grey-mid">
            Start tracking funds and reconciling statements in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignedOut>
            <div className="space-y-6">
              {inviteToken ? (
                <InviteDetails
                  invite={inviteInfo}
                  loading={inviteLoading}
                  error={inviteError}
                />
              ) : null}
              <SignUp
                path="/register"
                routing="path"
                signInUrl="/login"
                afterSignUpUrl={redirect || "/dashboard"}
                appearance={{
                  elements: {
                    formButtonPrimary:
                      "bg-ink text-paper hover:bg-ink/90 font-primary",
                  },
                }}
              />
              <p className="text-center text-sm text-grey-mid">
                Already have an account?{" "}
                <SignInButton
                  mode="modal"
                  afterSignInUrl={redirect || "/dashboard"}
                >
                  <span className="cursor-pointer text-ink underline">
                    Sign in
                  </span>
                </SignInButton>
                .
              </p>
            </div>
          </SignedOut>
          <SignedIn>
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-grey-mid">
                Redirecting to your dashboard…
              </p>
              <Button
                onClick={() => router.replace(redirect || "/dashboard")}
                className="bg-ink text-paper hover:bg-ink/90"
              >
                Continue
              </Button>
            </div>
          </SignedIn>
        </CardContent>
      </Card>
    </div>
  );
}
