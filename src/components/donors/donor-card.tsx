"use client";

import { useCallback } from "react";
import type { KeyboardEvent } from "react";
import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Doc } from "@/lib/convexGenerated";

export type DonorMetrics = {
  totalGiving?: number;
  transactionCount?: number;
  lastGiftDate?: string | null;
};

type DonorCardProps = {
  donor: Doc<"donors">;
  isSelected: boolean;
  onSelect: () => void;
  metrics?: DonorMetrics;
  showGiftAidBadge?: boolean;
  className?: string;
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export function DonorCard({
  donor,
  isSelected,
  onSelect,
  metrics,
  showGiftAidBadge = true,
  className,
}: DonorCardProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    },
    [onSelect],
  );

  const lastGiftLabel = metrics?.lastGiftDate
    ? dateFormatter.format(new Date(metrics.lastGiftDate))
    : "No gifts yet";

  const totalGivingLabel =
    metrics?.totalGiving && metrics.totalGiving > 0
      ? currency.format(metrics.totalGiving)
      : "£0.00";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "swiss-card group flex flex-col gap-3 rounded-lg border bg-white px-4 py-4 text-left transition-all duration-200",
        "border-ink/20 hover:border-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_rgba(0,0,0,0.1)]",
        isSelected && "border-ink bg-sage-light/30 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">{donor.name}</p>
          <p className="text-xs text-grey-mid">
            {donor.email ? donor.email : "No email"}
            {donor.bankReference ? ` · ${donor.bankReference}` : ""}
          </p>
        </div>
        {showGiftAidBadge && donor.giftAidDeclaration?.signed ? (
          <span className="swiss-badge flex items-center gap-1.5 bg-sage-light text-sage-dark border border-sage text-[10px]">
            <CheckCircle2 className="h-3 w-3" />
            Gift Aid
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-medium text-ink">
          Last gift: <span className="text-grey-mid font-normal font-[family-name:var(--font-mono)]">{lastGiftLabel}</span>
        </span>
        <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:inline-flex" />
        <span className="text-grey-mid">
          {metrics?.transactionCount ? `${metrics.transactionCount} gifts` : "No gifts recorded"}
        </span>
        <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:inline-flex" />
        <span className="font-medium text-sage font-[family-name:var(--font-mono)]">{totalGivingLabel}</span>
      </div>
    </div>
  );
}
