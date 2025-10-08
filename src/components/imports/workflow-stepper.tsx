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
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                step.status === "complete" && "border-success/40 bg-success/10 text-success hover:border-success",
                step.status === "active" && "border-ink bg-paper text-ink shadow-sm",
                step.status === "upcoming" && "border-ledger bg-paper text-grey-mid hover:border-ink hover:text-ink"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                  step.status === "complete" && "border-success bg-success text-paper",
                  step.status === "active" && "border-ink text-ink",
                  step.status === "upcoming" && "border-ledger text-grey-mid"
                )}
              >
                {step.status === "complete" ? <Check className="h-4 w-4" /> : step.id}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium uppercase tracking-wide">{step.label}</span>
                {step.description ? (
                  <span className="text-xs text-grey-mid">{step.description}</span>
                ) : null}
              </span>
            </button>
            {!isLast ? (
              <div className="absolute left-4 top-full hidden h-5 w-px translate-x-4 bg-ledger sm:block sm:h-px sm:w-full sm:translate-x-0 sm:translate-y-0" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
