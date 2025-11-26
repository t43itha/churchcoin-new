"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { CheckCircle2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOnboarding, clearOnboardingData } from "../../onboarding-provider";
import { api } from "@/lib/convexGenerated";
import { useSession } from "@/components/auth/session-provider";

export function Step5Complete() {
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
          {data.churchName} is ready to go. Let&apos;s start managing your church
          finances.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-highlight/50 border border-ledger rounded-lg p-6 mb-8 text-left">
        <h3 className="font-medium text-ink font-primary mb-4">
          Here&apos;s what we set up:
        </h3>
        <ul className="space-y-2 text-sm font-primary">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <span className="text-grey-dark">
              <strong className="text-ink">{data.churchName}</strong> created as
              your church
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <span className="text-grey-dark">
              General Fund and Building Fund ready for transactions
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <span className="text-grey-dark">
              Default income and expense categories configured
            </span>
          </li>
          {data.charityNumber && (
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <span className="text-grey-dark">
                Charity number {data.charityNumber} recorded
              </span>
            </li>
          )}
          {data.invitedEmails.length > 0 && (
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <span className="text-grey-dark">
                {data.invitedEmails.length} team member
                {data.invitedEmails.length > 1 ? "s" : ""} invited
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* Next steps hint */}
      <div className="text-sm text-grey-mid font-primary mb-8">
        <p>
          <strong className="text-ink">Next:</strong> Add your first transaction
          or import bank statements to get started.
        </p>
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
