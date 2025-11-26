"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import {
  OnboardingStepper,
  NEW_CHURCH_STEPS,
} from "@/components/onboarding/onboarding-stepper";
import { Step1ChurchName } from "@/components/onboarding/steps/new-church/step-1-church-name";
import { Step2ChurchDetails } from "@/components/onboarding/steps/new-church/step-2-church-details";
import { Step3ReviewFunds } from "@/components/onboarding/steps/new-church/step-3-review-funds";
import { Step4InviteTeam } from "@/components/onboarding/steps/new-church/step-4-invite-team";
import { Step5Complete } from "@/components/onboarding/steps/new-church/step-5-complete";

type PageProps = {
  params: Promise<{ step: string }>;
};

export default function NewChurchStepPage({ params }: PageProps) {
  const { step } = use(params);
  const stepNumber = parseInt(step, 10);
  const router = useRouter();
  const { setFlowType, isLoading } = useOnboarding();

  // Set flow type on mount
  useEffect(() => {
    setFlowType("new-church");
  }, [setFlowType]);

  // Validate step number
  useEffect(() => {
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 5) {
      router.replace("/onboarding/new-church/1");
    }
  }, [stepNumber, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ledger border-t-ink" />
      </div>
    );
  }

  const renderStep = () => {
    switch (stepNumber) {
      case 1:
        return <Step1ChurchName />;
      case 2:
        return <Step2ChurchDetails />;
      case 3:
        return <Step3ReviewFunds />;
      case 4:
        return <Step4InviteTeam />;
      case 5:
        return <Step5Complete />;
      default:
        return null;
    }
  };

  return (
    <div>
      <OnboardingStepper steps={NEW_CHURCH_STEPS} />
      {renderStep()}
    </div>
  );
}
