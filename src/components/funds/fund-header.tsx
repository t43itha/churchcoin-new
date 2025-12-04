"use client";

import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Doc } from "@/lib/convexGenerated";
import { cn } from "@/lib/utils";

// Swiss Ledger fund type styling
const typeLabels: Record<string, { label: string; tone: string }> = {
  general: {
    label: "General",
    tone: "bg-ink text-white",
  },
  restricted: {
    label: "Restricted",
    tone: "bg-sage-light text-sage-dark border border-sage",
  },
  designated: {
    label: "Designated",
    tone: "bg-amber-light text-amber-dark border border-amber",
  },
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

type FundHeaderProps = {
  fund: Doc<"funds">;
  incomeTotal: number;
  expenseTotal: number;
  onEdit: () => void;
};

export function FundHeader({ fund, incomeTotal, expenseTotal, onEdit }: FundHeaderProps) {
  const type = typeLabels[fund.type];

  return (
    <div className="sticky top-14 z-30 border-b border-ink/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-grey-mid">
            <Link
              href="/funds"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-grey-mid transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to funds
            </Link>
            <span className="text-ink/20">/</span>
            <span className="text-xs uppercase tracking-widest text-grey-mid">Fund Detail</span>
          </div>
          <Button
            size="sm"
            className="bg-ink text-white hover:bg-ink/90 font-medium"
            onClick={onEdit}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit fund
          </Button>
        </div>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-ink">{fund.name}</h1>
              <span className={cn(
                "swiss-badge text-[10px] font-semibold uppercase tracking-wider",
                type?.tone
              )}>
                {type?.label || fund.type}
              </span>
            </div>
            {fund.description ? (
              <p className="max-w-2xl text-sm text-grey-mid leading-relaxed">{fund.description}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
            <div>
              <p className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid mb-1">Balance</p>
              <p className="text-4xl font-bold text-ink font-[family-name:var(--font-mono)]">{currency.format(fund.balance)}</p>
            </div>
            <div className="flex gap-4">
              <Card className="swiss-card border border-ink bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-grey-mid">YTD Income</div>
                <div className="text-lg font-bold text-sage font-[family-name:var(--font-mono)]">
                  +{currency.format(incomeTotal)}
                </div>
              </Card>
              <Card className="swiss-card border border-ink bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-grey-mid">YTD Expense</div>
                <div className="text-lg font-bold text-error font-[family-name:var(--font-mono)]">
                  -{currency.format(expenseTotal)}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
