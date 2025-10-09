"use client";

import { useMemo } from "react";
import { Filter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
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
  searchQuery,
  onSearchChange,
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
        "flex flex-col gap-3 rounded-md border border-ledger bg-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {/* Left side: Filter icon and chip buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-grey-mid" aria-hidden />
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

      {/* Right side: Search input and Clear button */}
      <div className="flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-mid" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-[180px] border-ledger bg-paper pl-8 text-xs font-primary placeholder:text-grey-mid"
            />
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-grey-mid">
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
