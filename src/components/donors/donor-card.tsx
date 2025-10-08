"use client";

import { useCallback } from "react";
import type { KeyboardEvent } from "react";
import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
        "group flex flex-col gap-2 rounded-lg border bg-paper px-4 py-3 text-left shadow-sm transition",
        "border-ledger hover:border-ink hover:shadow",
        isSelected && "border-ink bg-highlight/60",
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
          <Badge
            variant="secondary"
            className="flex items-center gap-1 border-success/40 bg-success/10 text-success"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Gift Aid
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-grey-mid">
        <span className="font-medium text-ink">
          Last gift: <span className="text-grey-mid font-normal">{lastGiftLabel}</span>
        </span>
        <span className="hidden h-1 w-1 rounded-full bg-ledger sm:inline-flex" />
        <span>
          {metrics?.transactionCount ? `${metrics.transactionCount} gifts` : "No gifts recorded"}
        </span>
        <span className="hidden h-1 w-1 rounded-full bg-ledger sm:inline-flex" />
        <span>Total: {totalGivingLabel}</span>
      </div>
    </div>
  );
}
