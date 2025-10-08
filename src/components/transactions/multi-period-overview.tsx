"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendSparkline } from "./trend-sparkline";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

interface MultiPeriodOverviewProps {
  trends: Array<{
    year: number;
    month: number;
    income: number;
    expense: number;
    net: number;
  }>;
}

export function MultiPeriodOverview({ trends }: MultiPeriodOverviewProps) {
  const totals = useMemo(() => {
    return trends.reduce(
      (acc, t) => ({
        income: acc.income + t.income,
        expense: acc.expense + t.expense,
        net: acc.net + t.net,
      }),
      { income: 0, expense: 0, net: 0 }
    );
  }, [trends]);

  const avgNet = totals.net / trends.length;
  const isGrowing = trends.length > 1 && trends[0].net > trends[trends.length - 1].net;

  return (
    <Card className="border-ledger bg-paper">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-ink font-primary flex items-center gap-2">
          📈 Trend Overview - Last {trends.length} {trends.length === 1 ? "Month" : "Months"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Income */}
          <div>
            <div className="text-sm text-grey-mid font-primary mb-1">Total Income</div>
            <div className="text-2xl font-bold text-success font-primary mb-2">
              {currency.format(totals.income)}
            </div>
            <TrendSparkline
              data={trends.reverse().map(t => ({ value: t.income }))}
              color="rgb(10, 95, 56)"
            />
          </div>

          {/* Total Expenses */}
          <div>
            <div className="text-sm text-grey-mid font-primary mb-1">Total Expenses</div>
            <div className="text-2xl font-bold text-error font-primary mb-2">
              {currency.format(totals.expense)}
            </div>
            <TrendSparkline
              data={trends.map(t => ({ value: t.expense }))}
              color="rgb(139, 0, 0)"
            />
          </div>

          {/* Net */}
          <div>
            <div className="text-sm text-grey-mid font-primary mb-1">Net Position</div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`text-2xl font-bold font-primary ${totals.net >= 0 ? "text-success" : "text-error"}`}>
                {totals.net >= 0 ? "+" : ""}{currency.format(totals.net)}
              </div>
              {isGrowing ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-error" />
              )}
            </div>
            <TrendSparkline
              data={trends.map(t => ({ value: t.net }))}
              color={totals.net >= 0 ? "rgb(10, 95, 56)" : "rgb(139, 0, 0)"}
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-ledger text-sm text-grey-mid font-primary">
          Average monthly net: <span className="font-medium text-ink">{currency.format(avgNet)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
