"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

type FundraisingProgressProps = {
  pledgedTotal: number;
  donationTotal: number;
  target: number | null;
  outstandingToTarget: number | null;
  supporterCount: number;
};

export function FundraisingProgress({
  pledgedTotal,
  donationTotal,
  target,
  outstandingToTarget,
  supporterCount,
}: FundraisingProgressProps) {
  const progress = target && target > 0 ? Math.min(donationTotal / target, 1) : null;

  return (
    <Card className="border-ledger bg-paper">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs uppercase tracking-wide text-grey-mid">Fundraising progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-grey-mid">
            <span>Target {target ? currency.format(target) : "Not set"}</span>
            <span>
              {progress !== null ? `${Math.round(progress * 100)}% raised` : currency.format(donationTotal)}
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-ledger">
            <div
              className="h-2 rounded-full bg-success transition-all"
              style={{ width: `${progress !== null ? Math.min(progress, 1) * 100 : 100}%` }}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Raised" value={currency.format(donationTotal)} tone="text-success" />
          <Metric label="Pledged" value={currency.format(pledgedTotal)} tone="text-ink" />
          <Metric
            label="Outstanding"
            value={
              outstandingToTarget !== null
                ? currency.format(outstandingToTarget)
                : target
                ? "Target reached"
                : "—"
            }
            tone="text-grey-mid"
          />
        </div>
        <p className="text-xs uppercase tracking-wide text-grey-mid">
          {supporterCount} supporter{supporterCount === 1 ? "" : "s"} contributing to pledges.
        </p>
      </CardContent>
    </Card>
  );
}

type MetricProps = {
  label: string;
  value: string;
  tone: string;
};

function Metric({ label, value, tone }: MetricProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-grey-mid">{label}</p>
      <p className={`text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
