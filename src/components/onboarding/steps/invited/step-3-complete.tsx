"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { CheckCircle2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOnboarding, clearOnboardingData } from "../../onboarding-provider";
import { api } from "@/lib/convexGenerated";
import { useSession } from "@/components/auth/session-provider";

export function Step3Complete() {
  const router = useRouter();
  const { data } = useOnboarding();
  const { refresh } = useSession();
  const [isCompleting, setIsCompleting] = useState(false);

  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);

  const handleGoToDashboard = async () => {
    setIsCompleting(true);
    try {
      // Mark onboarding as complete in the database
      await completeOnboarding({});

      // Clear local onboarding data
      clearOnboardingData();

      // Refresh session to get updated user data
      await refresh();

      // Navigate to dashboard
      router.replace("/dashboard");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setIsCompleting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2 font-primary">
          You&apos;re all set!
        </h1>
        <p className="text-grey-mid font-primary">
          Welcome to {data.churchToJoin?.name ?? "your church"}&apos;s financial
          management system.
        </p>
      </div>

      {/* Quick tips */}
      <div className="bg-highlight/50 border border-ledger rounded-lg p-6 mb-8 text-left">
        <h3 className="font-medium text-ink font-primary mb-4">
          Getting started:
        </h3>
        <ul className="space-y-3 text-sm font-primary">
          <li className="flex items-start gap-2">
            <span className="text-success font-bold">1.</span>
            <span className="text-grey-dark">
              <strong className="text-ink">Dashboard</strong> - See an overview
              of all funds and recent activity
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success font-bold">2.</span>
            <span className="text-grey-dark">
              <strong className="text-ink">Transactions</strong> - View and
              manage income and expenses
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success font-bold">3.</span>
            <span className="text-grey-dark">
              <strong className="text-ink">Reports</strong> - Generate financial
              reports and statements
            </span>
          </li>
        </ul>
      </div>

      <Button
        onClick={handleGoToDashboard}
        className="font-primary w-full"
        size="lg"
        disabled={isCompleting}
      >
        {isCompleting ? (
          "Loading dashboard..."
        ) : (
          <>
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
