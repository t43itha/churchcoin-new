"use client";

import { use, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import {
  OnboardingStepper,
  INVITED_STEPS,
} from "@/components/onboarding/onboarding-stepper";
import { Step1Welcome } from "@/components/onboarding/steps/invited/step-1-welcome";
import { Step2ReviewRole } from "@/components/onboarding/steps/invited/step-2-review-role";
import { Step3Complete } from "@/components/onboarding/steps/invited/step-3-complete";
import { api } from "@/lib/convexGenerated";

type PageProps = {
  params: Promise<{ step: string }>;
};

function InvitedStepContent({ stepNumber }: { stepNumber: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams?.get("invite");
  const { setFlowType, updateData, isLoading, data } = useOnboarding();

  // Validate invite token
  const inviteValidation = useQuery(
    api.onboarding.validateInviteToken,
    inviteToken ? { token: inviteToken } : "skip"
  );

  // Set flow type on mount
  useEffect(() => {
    setFlowType("invited");
  }, [setFlowType]);

  // Update data when invite validation completes
  useEffect(() => {
    if (inviteValidation?.valid) {
      updateData({
        churchToJoin: {
          id: inviteValidation.churchId,
          name: inviteValidation.churchName,
        },
        assignedRole: inviteValidation.role,
        inviteToken: inviteToken ?? null,
      });
    }
  }, [inviteValidation, inviteToken, updateData]);

  // Validate step number
  useEffect(() => {
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 3) {
      router.replace("/onboarding/invited/1");
    }
  }, [stepNumber, router]);

  // Handle invalid/missing invite
  useEffect(() => {
    if (inviteValidation && !inviteValidation.valid) {
      router.replace("/onboarding/no-invite");
    }
  }, [inviteValidation, router]);

  if (isLoading || inviteValidation === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ledger border-t-ink" />
      </div>
    );
  }

  // If no invite token and user doesn't have church data, redirect
  if (!inviteToken && !data.churchToJoin) {
    router.replace("/onboarding/no-invite");
    return null;
  }

  const renderStep = () => {
    switch (stepNumber) {
      case 1:
        return <Step1Welcome />;
      case 2:
        return <Step2ReviewRole />;
      case 3:
        return <Step3Complete />;
      default:
        return null;
    }
  };

  return (
    <div>
      <OnboardingStepper steps={INVITED_STEPS} />
      {renderStep()}
    </div>
  );
}

export default function InvitedStepPage({ params }: PageProps) {
  const { step } = use(params);
  const stepNumber = parseInt(step, 10);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ledger border-t-ink" />
        </div>
      }
    >
      <InvitedStepContent stepNumber={stepNumber} />
    </Suspense>
  );
}
