"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboarding } from "./onboarding-provider";

type Step = {
  id: number;
  label: string;
  optional?: boolean;
};

type OnboardingStepperProps = {
  steps: Step[];
  className?: string;
};

export function OnboardingStepper({ steps, className }: OnboardingStepperProps) {
  const { currentStep, goToStep } = useOnboarding();

  return (
    <div className={cn("mb-8", className)}>
      {/* Mobile: Simple text indicator */}
      <div className="flex items-center justify-center gap-2 md:hidden">
        <span className="text-sm text-grey-mid">
          Step {currentStep} of {steps.length}
        </span>
        {steps[currentStep - 1]?.optional && (
          <span className="text-xs text-grey-mid">(Optional)</span>
        )}
      </div>

      {/* Desktop: Full stepper */}
      <div className="hidden md:flex items-center justify-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;
          const isClickable = isComplete; // Can only click completed steps

          return (
            <div key={step.id} className="flex items-center">
              {/* Step circle */}
              <button
                onClick={() => isClickable && goToStep(stepNumber)}
                disabled={!isClickable}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isComplete &&
                    "border-success bg-success text-paper cursor-pointer hover:bg-success/90",
                  isActive && "border-ink bg-ink text-paper",
                  isUpcoming && "border-ledger bg-paper text-grey-mid",
                  !isClickable && "cursor-default"
                )}
                type="button"
                aria-label={`${isComplete ? "Go to" : ""} Step ${stepNumber}: ${step.label}`}
                aria-current={isActive ? "step" : undefined}
              >
                {isComplete ? <Check className="h-5 w-5" /> : stepNumber}
              </button>

              {/* Step label (below circle) */}
              <div className="sr-only">{step.label}</div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-12 mx-2",
                    stepNumber < currentStep ? "bg-success" : "bg-ledger"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step labels (desktop only) */}
      <div className="hidden md:flex items-center justify-center mt-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;

          return (
            <div key={`label-${step.id}`} className="flex items-center">
              <div
                className={cn(
                  "w-10 text-center text-xs",
                  isActive ? "text-ink font-medium" : "text-grey-mid"
                )}
              >
                <span className="block truncate">{step.label}</span>
                {step.optional && (
                  <span className="block text-[10px] text-grey-mid">
                    (Optional)
                  </span>
                )}
              </div>

              {/* Spacer for connector */}
              {index < steps.length - 1 && <div className="w-16" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Pre-configured step lists for each flow
export const NEW_CHURCH_STEPS: Step[] = [
  { id: 1, label: "Name" },
  { id: 2, label: "Details", optional: true },
  { id: 3, label: "Funds", optional: true },
  { id: 4, label: "Invite", optional: true },
  { id: 5, label: "Done" },
];

export const INVITED_STEPS: Step[] = [
  { id: 1, label: "Welcome" },
  { id: 2, label: "Role" },
  { id: 3, label: "Done" },
];
