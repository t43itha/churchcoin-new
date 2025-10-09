"use client";

import { FundLedger } from "@/components/funds/fund-ledger";
import { type FundOverview } from "@/components/funds/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

type FundOverviewTabProps = {
  overview: FundOverview;
  onNavigateToLedger: () => void;
  onNavigateToFundraising?: () => void;
};

export function FundOverviewTab({ overview, onNavigateToLedger, onNavigateToFundraising }: FundOverviewTabProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Balance" value={currency.format(overview.fund.balance)} tone="text-ink" />
        <MetricCard title="Income" value={`+${currency.format(overview.incomeTotal)}`} tone="text-success" />
        <MetricCard title="Expense" value={`-${currency.format(overview.expenseTotal)}`} tone="text-error" />
      </div>

      {overview.fund.restrictions ? (
        <Card className="border border-dashed border-ledger bg-paper">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-grey-mid">Restrictions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-ink">{overview.fund.restrictions}</p>
          </CardContent>
        </Card>
      ) : null}

      {overview.fundraising ? (
        <Card className="border-ledger bg-paper">
          <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xs uppercase tracking-wide text-grey-mid">Fundraising summary</CardTitle>
              <p className="text-sm text-grey-mid">
                {overview.fundraising.supporterCount} supporter{overview.fundraising.supporterCount === 1 ? "" : "s"} with
                {" "}
                {overview.fundraising.pledgeCount} active pledges.
              </p>
            </div>
            {onNavigateToFundraising ? (
              <Button size="sm" className="font-primary" onClick={onNavigateToFundraising}>
                Manage pledges
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-2 w-full rounded-full bg-ledger">
              <div
                className="h-2 rounded-full bg-success"
                style={{
                  width: `${Math.min(
                    overview.fundraising.target && overview.fundraising.target > 0
                      ? (overview.fundraising.donationTotal / overview.fundraising.target) * 100
                      : 100,
                    100
                  )}%`,
                }}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                title="Raised"
                value={currency.format(overview.fundraising.donationTotal)}
                tone="text-success"
              />
              <MetricCard
                title="Pledged"
                value={currency.format(overview.fundraising.pledgedTotal)}
                tone="text-ink"
              />
              <MetricCard
                title="Outstanding"
                value={
                  overview.fundraising.outstandingToTarget !== null
                    ? currency.format(overview.fundraising.outstandingToTarget)
                    : "Target reached"
                }
                tone="text-grey-mid"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-ledger bg-paper">
        <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xs uppercase tracking-wide text-grey-mid">Ledger preview</CardTitle>
            <p className="text-sm text-grey-mid">Recent transactions with running balance.</p>
          </div>
          <Button size="sm" variant="outline" className="font-primary" onClick={onNavigateToLedger}>
            View full ledger
          </Button>
        </CardHeader>
        <CardContent>
          <FundLedger entries={overview.runningBalance.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  tone: string;
};

function MetricCard({ title, value, tone }: MetricCardProps) {
  return (
    <Card className="border-ledger bg-paper">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wide text-grey-mid">{title}</CardTitle>
      </CardHeader>
      <CardContent className={`text-2xl font-semibold ${tone}`}>{value}</CardContent>
    </Card>
  );
}
