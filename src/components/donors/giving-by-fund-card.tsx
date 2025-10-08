"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

type FundBreakdown = {
  fundName: string;
  amount: number;
  count: number;
};

type GivingByFundCardProps = {
  givingByFund: FundBreakdown[];
  className?: string;
};

export function GivingByFundCard({ givingByFund, className }: GivingByFundCardProps) {
  return (
    <Card className={cn("border-ledger bg-paper shadow-none", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-ink">Giving by fund</CardTitle>
      </CardHeader>
      <CardContent>
        {givingByFund.length === 0 ? (
          <p className="text-sm text-grey-mid">No giving recorded for this donor yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {givingByFund.map((fund) => (
              <li key={fund.fundName} className="flex items-center justify-between text-ink">
                <span>{fund.fundName}</span>
                <span className="font-medium">
                  {currency.format(fund.amount)}
                  <span className="ml-2 text-xs text-grey-mid">({fund.count})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
