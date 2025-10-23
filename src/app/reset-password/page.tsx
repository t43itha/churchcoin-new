"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Mode = "request" | "reset" | "success";
type StatusMessage = { type: "success" | "error"; message: string };

const isProduction = process.env.NODE_ENV === "production";

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const initialToken = searchParams?.get("token") ?? "";

  const [mode, setMode] = useState<Mode>(initialToken ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [developmentToken, setDevelopmentToken] = useState<string | null>(
    initialToken || null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromParams = searchParams?.get("token") ?? "";
    if (tokenFromParams) {
      setToken(tokenFromParams);
      setMode("reset");
      if (!developmentToken) {
        setDevelopmentToken(tokenFromParams);
      }
    }
  }, [searchParams, developmentToken]);

  const handleRequestReset = async (event: FormEvent) => {
    event.preventDefault();
    if (requestSubmitting) {
      return;
    }

    setRequestSubmitting(true);
    setStatus(null);

    const response = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "" }));
      setStatus({
        type: "error",
        message: body.error || "We couldn't start the reset process. Try again soon.",
      });
      setRequestSubmitting(false);
      return;
    }

    const body = await response.json().catch(() => ({}));

    let successCopy =
      "If that email is registered, we'll email reset instructions shortly.";

    if (typeof body.token === "string" && body.token) {
      setDevelopmentToken(body.token);
      setToken(body.token);
      setMode("reset");
      successCopy = "Use the token below to finish resetting your password.";
    }

    setStatus({
      type: "success",
      message: successCopy,
    });

    setRequestSubmitting(false);
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (resetSubmitting) {
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match" });
      return;
    }

    setResetSubmitting(true);
    setStatus(null);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "" }));
      setStatus({
        type: "error",
        message: body.error || "We couldn't reset your password. Please try again.",
      });
      setResetSubmitting(false);
      return;
    }

    setSuccessMessage("Your password has been updated. You can sign in with it now.");
    setMode("success");
    setResetSubmitting(false);
  };

  const renderStatusMessage = () => {
    if (!status) {
      return null;
    }

    const tone =
      status.type === "success"
        ? "border-success/40 bg-success/5 text-success"
        : "border-error/40 bg-error/5 text-error";

    return (
      <p className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
        {status.message}
      </p>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <Card className="w-full max-w-md border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-ink">
            Reset your password
          </CardTitle>
          <CardDescription className="text-grey-mid">
            {mode === "request"
              ? "We'll send a link to the email address associated with your account."
              : mode === "reset"
                ? "Enter the reset token and choose a new password."
                : "You're all set—sign in with your new password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "request" ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-grey-mid">
                  Email
                </label>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="font-primary"
                />
              </div>
              {renderStatusMessage()}
              {!isProduction && developmentToken ? (
                <div className="rounded-md border border-grey-light bg-grey-light/40 px-3 py-2 text-xs text-grey-dark">
                  <p className="font-semibold">Development reset token</p>
                  <code className="break-all text-ink">{developmentToken}</code>
                  <p className="mt-2">
                    Token copied here for local testing. In production this would be
                    emailed to the user.
                  </p>
                </div>
              ) : null}
              <Button
                type="submit"
                disabled={requestSubmitting}
                className="w-full bg-ink text-paper hover:bg-ink/90"
              >
                {requestSubmitting ? "Sending reset link..." : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-grey-mid">
                Remembered your password?{" "}
                <Link className="text-ink underline" href="/login">
                  Go back to sign in
                </Link>
                .
              </p>
            </form>
          ) : null}

          {mode === "reset" ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-grey-mid">
                  Reset token
                </label>
                <Input
                  type="text"
                  required
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="font-primary"
                />
                <p className="text-xs text-grey-mid">
                  Tokens expire after one hour and can only be used once.
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-grey-mid">
                  New password
                </label>
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="font-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-grey-mid">
                  Confirm new password
                </label>
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="font-primary"
                />
              </div>
              {renderStatusMessage()}
              <Button
                type="submit"
                disabled={resetSubmitting}
                className="w-full bg-ink text-paper hover:bg-ink/90"
              >
                {resetSubmitting ? "Updating password..." : "Reset password"}
              </Button>
              <button
                type="button"
                onClick={() => setMode("request")}
                className="mx-auto block text-sm text-grey-mid underline"
              >
                Need a new token? Request another
              </button>
            </form>
          ) : null}

          {mode === "success" ? (
            <div className="space-y-4 text-center">
              {successMessage ? (
                <p className="rounded-md border border-success/40 bg-success/5 px-3 py-2 text-sm text-success">
                  {successMessage}
                </p>
              ) : null}
              <Button asChild className="w-full bg-ink text-paper hover:bg-ink/90">
                <Link href="/login">Return to sign in</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ResetPasswordSuspenseFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <Card className="w-full max-w-md border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-ink">Loading</CardTitle>
          <CardDescription className="text-grey-mid">
            Preparing the reset experience...
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSuspenseFallback />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
