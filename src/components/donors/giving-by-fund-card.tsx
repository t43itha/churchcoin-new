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
    <Card className={cn("swiss-card border border-ink bg-white shadow-none", className)}>
      <CardHeader className="pb-3 border-b border-ink/10">
        <CardTitle className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid">
          Giving by fund
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {givingByFund.length === 0 ? (
          <p className="text-sm text-grey-mid">No giving recorded for this donor yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {givingByFund.map((fund) => (
              <li key={fund.fundName} className="flex items-center justify-between text-ink">
                <span className="font-medium">{fund.fundName}</span>
                <span className="flex items-center gap-2">
                  <span className="font-bold text-sage font-[family-name:var(--font-mono)]">
                    {currency.format(fund.amount)}
                  </span>
                  <span className="swiss-badge text-[10px] bg-ink/5 text-grey-mid border border-ink/10">
                    {fund.count} {fund.count === 1 ? "gift" : "gifts"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
