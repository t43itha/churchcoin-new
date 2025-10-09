"use client";

import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Doc } from "@/lib/convexGenerated";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, { label: string; tone: string }> = {
  general: {
    label: "General Fund",
    tone: "bg-ledger text-grey-dark",
  },
  restricted: {
    label: "Restricted Fund",
    tone: "bg-highlight text-grey-dark",
  },
  designated: {
    label: "Designated Fund",
    tone: "bg-paper border border-ledger text-grey-dark",
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
    <div className="sticky top-16 z-30 border-b border-ledger bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-grey-mid">
            <Link
              href="/funds"
              className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-grey-mid transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to funds
            </Link>
            <span className="text-grey-light">/</span>
            <span className="text-xs uppercase tracking-wide text-grey-mid">Fund Detail</span>
          </div>
          <Button size="sm" className="font-primary" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Edit fund
          </Button>
        </div>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-ink">{fund.name}</h1>
              <Badge className={cn("font-primary text-xs", type?.tone)}>
                {type?.label || fund.type}
              </Badge>
            </div>
            {fund.description ? (
              <p className="max-w-2xl text-sm text-grey-mid">{fund.description}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-grey-mid">Balance</p>
              <p className="text-4xl font-bold text-ink">{currency.format(fund.balance)}</p>
            </div>
            <div className="flex gap-4 text-sm text-grey-mid">
              <Card className="border-ledger bg-paper px-4 py-3 text-sm text-success">
                <div className="text-xs uppercase tracking-wide text-grey-mid">YTD Income</div>
                <div className="text-lg font-semibold text-success">
                  +{currency.format(incomeTotal)}
                </div>
              </Card>
              <Card className="border-ledger bg-paper px-4 py-3 text-sm text-error">
                <div className="text-xs uppercase tracking-wide text-grey-mid">YTD Expense</div>
                <div className="text-lg font-semibold text-error">
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
