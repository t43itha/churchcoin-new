"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransactionLedger, type TransactionLedgerRow } from "./transaction-ledger";
import { formatPeriodLabel, type Period } from "@/lib/periods";
import { useQuery } from "convex/react";
import { api, type Id, type Doc } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

interface PeriodCardProps {
  period: Period;
  churchId: Id<"churches">;
  summary: {
    income: number;
    expense: number;
    count: number;
    unreconciled: number;
    uncategorized: number;
  };
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (transaction: Doc<"transactions">) => void;
  onDelete?: (id: Id<"transactions">) => Promise<void>;
  onToggleReconciled?: (id: Id<"transactions">, reconciled: boolean) => Promise<void>;
  onRequestReceipt?: (transaction: Doc<"transactions">) => Promise<void>;
  onSuggestCategory?: (transaction: Doc<"transactions">) => Promise<void>;
}

export function PeriodCard({
  period,
  churchId,
  summary,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleReconciled,
  onRequestReceipt,
  onSuggestCategory,
}: PeriodCardProps) {
  const [loadLimit, setLoadLimit] = useState(100);

  // Only load full transactions if expanded
  const ledger = useQuery(
    api.transactions.getLedgerByPeriod,
    isExpanded ? {
      churchId,
      periodYear: period.year,
      periodMonth: period.month,
      limit: loadLimit,
    } : "skip"
  );

  const net = summary.income - summary.expense;
  const isPositive = net >= 0;

  return (
    <Card className="border-ledger bg-paper">
      <CardHeader className="pb-3">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full text-left hover:bg-highlight rounded-md p-2 -m-2 transition-colors"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-grey-mid" />
            ) : (
              <ChevronRight className="h-5 w-5 text-grey-mid" />
            )}
            <h3 className="text-lg font-semibold text-ink font-primary">
              {formatPeriodLabel(period)}
            </h3>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="font-primary text-xs">
                {summary.count} transactions
              </Badge>
              {summary.unreconciled > 0 && (
                <Badge variant="destructive" className="font-primary text-xs">
                  ⚠️ {summary.unreconciled} unreconciled
                </Badge>
              )}
            </div>

            <div className="text-right min-w-[100px]">
              <div className="text-sm text-grey-mid font-primary">Net</div>
              <div className={`text-lg font-bold font-primary ${isPositive ? "text-success" : "text-error"}`}>
                {isPositive ? "+" : ""}{currency.format(net)}
              </div>
            </div>
          </div>
        </button>

        {/* Summary row - always visible */}
        <div className="flex items-center gap-6 mt-2 text-sm font-primary">
          <div className="flex items-center gap-2">
            <span className="text-grey-mid">Income:</span>
            <span className="text-success font-medium">{currency.format(summary.income)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-grey-mid">Expenses:</span>
            <span className="text-error font-medium">{currency.format(summary.expense)}</span>
          </div>
          {summary.uncategorized > 0 && (
            <div className="flex items-center gap-2 text-grey-mid">
              <span>{summary.uncategorized} need categorization</span>
            </div>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {ledger === undefined ? (
            <div className="text-sm text-grey-mid p-4 text-center">
              Loading transactions...
            </div>
          ) : ledger.length === 0 ? (
            <div className="text-sm text-grey-mid p-4 text-center">
              No transactions in this period
            </div>
          ) : (
            <div className="space-y-4">
              <TransactionLedger
                rows={ledger as TransactionLedgerRow[]}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleReconciled={onToggleReconciled}
                onRequestReceipt={onRequestReceipt}
                onSuggestCategory={onSuggestCategory}
              />

              {ledger.length === loadLimit && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setLoadLimit(prev => prev + 100)}
                    className="font-primary"
                  >
                    Load More Transactions
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
