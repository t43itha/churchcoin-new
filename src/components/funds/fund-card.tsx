"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, { label: string; description: string; tone: string }> = {
  general: {
    label: "General Fund",
    description: "Unrestricted giving and operating expenses",
    tone: "bg-ledger text-grey-dark",
  },
  restricted: {
    label: "Restricted Fund",
    description: "Must be spent according to donor intent",
    tone: "bg-highlight text-grey-dark",
  },
  designated: {
    label: "Designated Fund",
    description: "Set aside by trustees for a specific purpose",
    tone: "bg-paper border border-ledger text-grey-dark",
  },
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

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
};

type FundCardProps = {
  fund: FundCardSummary;
  onViewLedger?: () => void;
  onEdit?: () => void;
};

export function FundCard({ fund, onViewLedger, onEdit }: FundCardProps) {
  const type = typeLabels[fund.type];

  return (
    <Card className="h-full border-ledger bg-paper shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg text-ink">{fund.name}</CardTitle>
            <CardDescription className="text-grey-mid">
              {fund.description || type.description}
            </CardDescription>
          </div>
          <Badge className={cn("font-primary text-xs", type?.tone)}>
            {type?.label || fund.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm text-grey-mid">Current Balance</p>
            <p className="text-2xl font-semibold text-ink">
              {currency.format(fund.balance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-success">+{currency.format(fund.incomeTotal)}</p>
            <p className="text-sm text-error">-{currency.format(fund.expenseTotal)}</p>
          </div>
        </div>
        {fund.restrictions ? (
          <div className="rounded-md border border-dashed border-ledger bg-paper px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-grey-mid">
              Restrictions
            </p>
            <p className="text-sm text-ink">{fund.restrictions}</p>
          </div>
        ) : null}
        <div className="text-xs text-grey-mid">
          {fund.lastTransactionDate ? (
            <span>Last activity: {new Date(fund.lastTransactionDate).toLocaleDateString("en-GB")}</span>
          ) : (
            <span>No activity recorded yet</span>
          )}
        </div>
      </CardContent>
      {(onViewLedger || onEdit) && (
        <CardFooter className="flex items-center justify-end gap-2 border-t border-ledger pt-4">
          {onViewLedger ? (
            <Button variant="outline" size="sm" className="font-primary" onClick={onViewLedger}>
              View Ledger
            </Button>
          ) : null}
          {onEdit ? (
            <Button size="sm" className="font-primary" onClick={onEdit}>
              Edit Fund
            </Button>
          ) : null}
        </CardFooter>
      )}
    </Card>
  );
}
