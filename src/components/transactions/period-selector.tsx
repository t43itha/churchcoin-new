"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 text-grey-mid" />
        <span className="text-sm text-grey-mid font-primary">Period:</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {modes.map((mode) => (
          <Button
            key={mode.value}
            variant={value === mode.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(mode.value)}
            className="font-primary text-xs"
          >
            {mode.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
