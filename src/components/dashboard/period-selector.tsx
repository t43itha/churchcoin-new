"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
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
  onNavigate?: (direction: "previous" | "next") => void;
  onCustomRange?: () => void;
  comparisonLabel?: ReactNode;
}

export function PeriodSelector({
  options,
  selected,
  onSelect,
  onNavigate,
  onCustomRange,
  comparisonLabel,
}: PeriodSelectorProps) {
  return (
    <Card className="border-ledger bg-paper shadow-none">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 w-9 border-ledger font-primary"
            onClick={() => onNavigate?.("previous")}
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 overflow-x-auto">
            {options.map((option) => {
              const isActive = option.id === selected;
              return (
                <motion.button
                  key={option.id}
                  onClick={() => onSelect(option.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium font-primary uppercase tracking-wider transition-colors",
                    isActive
                      ? "border-ink bg-ink text-paper"
                      : "border-ledger bg-paper text-grey-mid hover:bg-highlight"
                  )}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                >
                  {option.label}
                  {option.shortcut && (
                    <span className="ml-2 text-[10px] font-normal text-grey-dark">
                      {option.shortcut}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
          <Button
            variant="outline"
            className="h-9 w-9 border-ledger font-primary"
            onClick={() => onNavigate?.("next")}
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {comparisonLabel && (
            <span className="hidden text-xs font-primary text-grey-mid sm:inline-flex">
              {comparisonLabel}
            </span>
          )}
          <Button
            variant="outline"
            className="border-ledger font-primary text-xs uppercase tracking-wide"
            onClick={onCustomRange}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Custom Range
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
