"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  SignIn,
  SignUpButton,
  SignedIn,
  SignedOut,
  useAuth,
} from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? "/dashboard";
  const { isLoaded, isSignedIn } = useAuth();

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
            Welcome back
          </CardTitle>
          <CardDescription className="text-grey-mid">
            Sign in to continue managing your church finances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignedOut>
            <div className="space-y-6">
              <SignIn
                path="/login"
                routing="path"
                signUpUrl="/register"
                afterSignInUrl={redirect || "/dashboard"}
                appearance={{
                  elements: {
                    formButtonPrimary:
                      "bg-ink text-paper hover:bg-ink/90 font-primary",
                  },
                }}
              />
              <p className="text-center text-sm text-grey-mid">
                Need an account?{" "}
                <SignUpButton
                  mode="modal"
                  afterSignUpUrl={redirect || "/dashboard"}
                >
                  <span className="cursor-pointer text-ink underline">
                    Create one now
                  </span>
                </SignUpButton>
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
