"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

export interface PeriodOption {
  id: string;
  label: string;
  shortcut?: string;
  description?: string;
}

interface PeriodSelectorProps {
  options: PeriodOption[];
  selected: string;
  onSelect: (id: string) => void;
  onNavigate?: (direction: "previous" | "next") => void; // kept for backwards compatibility
  onCustomRange?: () => void;
  comparisonLabel?: ReactNode; // deprecated in new design
  label?: string; // display label like "Sep 2025 vs Aug 2025"
}

export function PeriodSelector({
  options,
  selected,
  onSelect,
  onCustomRange,
  label,
}: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedMenuLabel = useMemo(() => {
    const found = options.find((o) => o.id === selected);
    return found?.label ?? "This Month vs Last Month";
  }, [options, selected]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label="Select date range and comparison period"
          aria-haspopup="menu"
          aria-expanded={open}
          className="h-10 w-[280px] justify-between border-ledger bg-white font-medium text-ink shadow-sm"
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarDays className="h-4 w-4" />
            <span className="truncate" title={label ?? selectedMenuLabel}>
              {label ?? selectedMenuLabel}
            </span>
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-medium text-ink">
          {label ?? selectedMenuLabel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={selected} onValueChange={onSelect}>
          <DropdownMenuRadioItem value="this-month">
            This Month vs Last Month
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="last-month">
            Last Month vs Prior Month
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="this-quarter">
            This Quarter vs Last Quarter
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="this-year">
            This Year vs Last Year
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ytd">
            Year to Date vs Prior YTD
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onCustomRange?.()}>
          <CalendarDays className="h-4 w-4" />
          Custom Range...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
