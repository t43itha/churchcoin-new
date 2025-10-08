"use client";

import { useMemo } from "react";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type FilterState = {
  hasGiftAid?: boolean;
  hasEmail?: boolean;
  hasPhone?: boolean;
  lastGiftPeriod?: "week" | "month" | "quarter" | "year";
  isActive?: boolean;
};

type DonorFilterChipsProps = {
  activeFilters: FilterState;
  onFilterChange: (next: FilterState) => void;
  className?: string;
};

const periodLabels: Record<NonNullable<FilterState["lastGiftPeriod"]>, string> = {
  week: "7 days",
  month: "30 days",
  quarter: "90 days",
  year: "12 months",
};

export function DonorFilterChips({
  activeFilters,
  onFilterChange,
  className,
}: DonorFilterChipsProps) {
  const activeCount = useMemo(() => {
    return Object.entries(activeFilters).reduce((count, [key, value]) => {
      if (key === "lastGiftPeriod") {
        return value ? count + 1 : count;
      }
      return value ? count + 1 : count;
    }, 0);
  }, [activeFilters]);

  const toggle = (key: keyof FilterState) => {
    const current = activeFilters[key];
    onFilterChange({ ...activeFilters, [key]: !current });
  };

  const updatePeriod = (period: FilterState["lastGiftPeriod"]) => {
    onFilterChange({ ...activeFilters, lastGiftPeriod: period });
  };

  const clearAll = () => {
    onFilterChange({});
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border border-ledger bg-paper px-3 py-2",
        className,
      )}
    >
      <Filter className="h-4 w-4 text-grey-mid" aria-hidden />
      <div className="flex flex-wrap items-center gap-2">
        <ChipButton
          label="Gift Aid"
          active={Boolean(activeFilters.hasGiftAid)}
          onClick={() => toggle("hasGiftAid")}
        />
        <ChipButton
          label="Has email"
          active={Boolean(activeFilters.hasEmail)}
          onClick={() => toggle("hasEmail")}
        />
        <ChipButton
          label="Has phone"
          active={Boolean(activeFilters.hasPhone)}
          onClick={() => toggle("hasPhone")}
        />
        <ChipButton
          label="Active donors"
          active={Boolean(activeFilters.isActive)}
          onClick={() => toggle("isActive")}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={activeFilters.lastGiftPeriod ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 rounded-full border-ledger px-3 text-xs",
                activeFilters.lastGiftPeriod
                  ? "bg-ink text-paper hover:bg-ink/90"
                  : "bg-paper text-grey-mid hover:bg-highlight",
              )}
            >
              Last gift
              {activeFilters.lastGiftPeriod
                ? ` (${periodLabels[activeFilters.lastGiftPeriod]})`
                : ""
              }
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40 font-mono text-xs">
            {Object.entries(periodLabels).map(([value, label]) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => updatePeriod(value as FilterState["lastGiftPeriod"])}
                className="cursor-pointer"
              >
                {label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={() => updatePeriod(undefined)}>Any time</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="ml-auto flex items-center gap-2 text-xs text-grey-mid">
        {activeCount > 0 ? <span>{activeCount} active</span> : null}
        <button
          type="button"
          onClick={clearAll}
          disabled={activeCount === 0}
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 transition",
            activeCount > 0
              ? "text-ink hover:bg-highlight"
              : "cursor-not-allowed text-grey-light",
          )}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
    </div>
  );
}

type ChipButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function ChipButton({ label, active, onClick }: ChipButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      onClick={onClick}
      variant={active ? "default" : "outline"}
      className={cn(
        "h-8 rounded-full border-ledger px-3 text-xs",
        active
          ? "bg-ink text-paper hover:bg-ink/90"
          : "bg-paper text-grey-mid hover:bg-highlight",
      )}
    >
      {label}
    </Button>
  );
}
