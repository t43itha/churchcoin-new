"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUkDateNumeric } from "@/lib/dates";
import { formatCurrency } from "@/lib/formats";
import { cn } from "@/lib/utils";

// Swiss Ledger fund type styling
const typeLabels: Record<string, { label: string; description: string; tone: string }> = {
  general: {
    label: "General",
    description: "Unrestricted giving and operating expenses",
    tone: "bg-ink text-white",
  },
  restricted: {
    label: "Restricted",
    description: "Must be spent according to donor intent",
    tone: "bg-sage-light text-sage-dark border border-sage",
  },
  designated: {
    label: "Designated",
    description: "Set aside by trustees for a specific purpose",
    tone: "bg-amber-light text-amber-dark border border-amber",
  },
};

export type FundCardSummary = {
  id: string;
  name: string;
  type: "general" | "restricted" | "designated";
  balance: number;
  description?: string | null;
  restrictions?: string | null;
  incomeTotal: number;
  expenseTotal: number;
  lastTransactionDate?: string | null;
  isFundraising: boolean;
  fundraisingTarget: number | null;
  fundraisingRaised: number;
  fundraisingPledged: number;
  outstandingToTarget: number | null;
  supporterCount: number;
};

type FundCardProps = {
  fund: FundCardSummary;
  onSelect?: () => void;
  onEdit?: () => void;
};

/**
 * Fund card component - Swiss Ledger styled
 *
 * Features:
 * - Hard shadow with lift effect on hover
 * - Fund type badges (General: ink, Restricted: sage, Designated: amber)
 * - Monospace font for financial values
 * - Sage progress bars for fundraising
 */
export const FundCard = memo(function FundCard({ fund, onSelect, onEdit }: FundCardProps) {
  const type = typeLabels[fund.type];
  const hasFundraising = fund.isFundraising;
  const target = fund.fundraisingTarget;
  const raised = fund.fundraisingRaised;
  const pledged = fund.fundraisingPledged;
  const outstanding = fund.outstandingToTarget;
  const progress = target && target > 0 ? Math.min(raised / target, 1) : null;

  return (
    <Card
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      className={cn(
        "swiss-card h-full border border-ink bg-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
        onSelect && "swiss-card-interactive cursor-pointer"
      )}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-ink truncate">{fund.name}</CardTitle>
            <CardDescription className="text-grey-mid text-sm leading-relaxed">
              {fund.description || type.description}
            </CardDescription>
          </div>
          <span className={cn(
            "swiss-badge text-[10px] font-semibold uppercase tracking-wider shrink-0",
            type?.tone
          )}>
            {type?.label || fund.type}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-ink font-[family-name:var(--font-mono)]">
              {formatCurrency(fund.balance)}
            </p>
          </div>
          <div className="text-right font-[family-name:var(--font-mono)]">
            <p className="text-sm font-medium text-sage">+{formatCurrency(fund.incomeTotal)}</p>
            <p className="text-sm font-medium text-error">-{formatCurrency(fund.expenseTotal)}</p>
          </div>
        </div>
        {hasFundraising ? (
          <div className="space-y-3 rounded-lg border border-ink/10 bg-sage-light/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-grey-mid">Fundraising</span>
              <span className="text-xs font-medium text-sage-dark">
                {progress !== null
                  ? `${Math.round(progress * 100)}% raised`
                  : `${formatCurrency(raised)} raised`}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-ink/10">
              <div
                className="h-2 rounded-full bg-sage transition-all"
                style={{ width: `${progress !== null ? Math.min(progress, 1) * 100 : 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-[family-name:var(--font-mono)]">
              <span className="text-ink font-medium">{formatCurrency(raised)} raised</span>
              <span className="text-grey-mid">
                {target ? `of ${formatCurrency(target)}` : "No target set"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-grey-mid">
              <span>
                {fund.supporterCount} supporter{fund.supporterCount === 1 ? "" : "s"}
              </span>
              {pledged > raised ? (
                <span className="text-amber-dark">{formatCurrency(pledged)} pledged</span>
              ) : null}
            </div>
            {outstanding !== null && outstanding > 0 ? (
              <div className="text-xs font-medium text-amber-dark">
                {formatCurrency(outstanding)} to target
              </div>
            ) : null}
          </div>
        ) : null}
        {fund.restrictions ? (
          <div className="rounded-lg border border-amber/30 bg-amber-light/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-dark mb-1">
              Restrictions
            </p>
            <p className="text-sm text-ink leading-relaxed">{fund.restrictions}</p>
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-2 border-t border-ink/5">
          <span className="text-xs text-grey-mid">
            {fund.lastTransactionDate ? (
              <>Last activity: <span className="font-medium text-ink">{formatUkDateNumeric(fund.lastTransactionDate) || "—"}</span></>
            ) : (
              "No activity recorded yet"
            )}
          </span>
        </div>
      </CardContent>
      {onEdit ? (
        <CardFooter className="flex items-center justify-end gap-2 border-t border-ink/10 pt-4 pb-4">
          <Button
            size="sm"
            variant="outline"
            className="border-ink text-ink hover:bg-ink hover:text-white transition-colors font-medium"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            Edit Fund
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
});
