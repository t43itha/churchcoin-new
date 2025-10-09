"use client";

import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type PeriodViewMode = "current" | "last-3" | "last-6" | "all";

interface PeriodSelectorProps {
  value: PeriodViewMode;
  onChange: (mode: PeriodViewMode) => void;
  className?: string;
}

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const modes = [
    { value: "current" as const, label: "This Month" },
    { value: "last-3" as const, label: "Last 3 Months" },
    { value: "last-6" as const, label: "Last 6 Months" },
    { value: "all" as const, label: "All Transactions" },
  ];

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-grey-mid" />
        <span className="text-sm text-grey-mid font-primary">Period:</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {modes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={cn(
              "h-8 rounded-full border-ledger px-4 text-xs font-primary transition-colors",
              value === mode.value
                ? "bg-ink text-paper hover:bg-ink/90"
                : "border bg-paper text-grey-mid hover:bg-highlight"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
