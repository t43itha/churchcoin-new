"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type StepStatus = "complete" | "active" | "upcoming";

export type WorkflowStep = {
  id: number;
  label: string;
  status: StepStatus;
  description?: string;
};

type WorkflowStepperProps = {
  steps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep) => void;
};

export function WorkflowStepper({ steps, onStepClick }: WorkflowStepperProps) {
  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex-1">
            <button
              type="button"
              onClick={() => onStepClick?.(step)}
              className={cn(
                "swiss-card flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-200",
                step.status === "complete" && "border-sage bg-sage-light/50 text-ink hover:border-sage hover:shadow-[4px_4px_0px_rgba(107,142,107,0.2)]",
                step.status === "active" && "border-ink bg-white text-ink shadow-[4px_4px_0px_rgba(0,0,0,0.1)]",
                step.status === "upcoming" && "border-ink/20 bg-white text-grey-mid hover:border-ink hover:text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_rgba(0,0,0,0.1)]"
              )}
              aria-current={step.status === "active" ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded text-sm font-bold transition-colors",
                  step.status === "complete" && "bg-sage text-white",
                  step.status === "active" && "bg-ink text-white",
                  step.status === "upcoming" && "bg-ink/10 text-grey-mid border border-ink/20"
                )}
              >
                {step.status === "complete" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  String(step.id).padStart(2, "0")
                )}
              </span>
              <span className="flex flex-col">
                <span
                  className={cn(
                    "text-sm font-semibold uppercase tracking-wide",
                    step.status === "complete" && "text-sage-dark",
                    step.status === "active" && "text-ink",
                    step.status === "upcoming" && "text-grey-mid"
                  )}
                >
                  {step.label}
                </span>
                {step.description ? (
                  <span className={cn(
                    "text-xs",
                    step.status === "complete" ? "text-sage" : "text-grey-mid"
                  )}>
                    {step.description}
                  </span>
                ) : null}
              </span>
            </button>
            {!isLast ? (
              <div className="absolute left-4 top-full hidden h-5 w-px translate-x-4 bg-ink/10 sm:block sm:h-px sm:w-full sm:translate-x-0 sm:translate-y-0" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
