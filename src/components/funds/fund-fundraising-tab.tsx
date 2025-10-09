"use client";

import { useMemo, useState } from "react";

import { FundraisingProgress } from "@/components/funds/fundraising-progress";
import { PledgeTable } from "@/components/funds/pledge-table";
import { type FundraisingSnapshot } from "@/components/funds/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Doc } from "@/lib/convexGenerated";
import { formatUkDateNumeric } from "@/lib/dates";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

type FundFundraisingTabProps = {
  fund: Doc<"funds">;
  fundraising: FundraisingSnapshot;
  onAddPledge: () => void;
  onImportPledges: () => void;
};

export function FundFundraisingTab({ fund, fundraising, onAddPledge, onImportPledges }: FundFundraisingTabProps) {
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]["value"]>("all");

  const supporters = useMemo(() => {
    if (statusFilter === "all") {
      return fundraising.supporters;
    }
    return fundraising.supporters.filter((supporter) => supporter.computedStatus === statusFilter);
  }, [fundraising.supporters, statusFilter]);

  return (
    <div className="space-y-8">
      <FundraisingProgress
        pledgedTotal={fundraising.pledgedTotal}
        donationTotal={fundraising.donationTotal}
        target={fund.fundraisingTarget ?? null}
        outstandingToTarget={fundraising.outstandingToTarget}
        supporterCount={fundraising.supporterCount}
      />

      <Card className="border-ledger bg-paper">
        <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xs uppercase tracking-wide text-grey-mid">Pledge management</CardTitle>
            <p className="text-sm text-grey-mid">
              Manage pledges, monitor fulfilment, and coordinate donor follow-up.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="font-primary" onClick={onAddPledge}>
              Add pledge
            </Button>
            <Button size="sm" variant="outline" className="font-primary" onClick={onImportPledges}>
              Import CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-grey-mid">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-full border px-3 py-1 transition-colors ${
                  statusFilter === filter.value
                    ? "border-ink bg-ink text-paper"
                    : "border-ledger text-grey-mid hover:border-ink hover:text-ink"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <PledgeTable supporters={supporters} emptyMessage="No pledges match this status." />
        </CardContent>
      </Card>

      {fundraising.donorsWithoutPledge.length > 0 ? (
        <Card className="border-ledger bg-paper">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-grey-mid">Donors without pledges</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 md:grid-cols-2">
              {fundraising.donorsWithoutPledge.map((donor) => {
                const lastDonation = donor.lastDonationDate
                  ? formatUkDateNumeric(donor.lastDonationDate) || "—"
                  : "—";
                return (
                  <li key={donor.donorId} className="rounded-md border border-ledger px-4 py-3">
                    <div className="font-medium text-ink">{donor.donorName}</div>
                    <div className="text-xs text-grey-mid">
                      {donor.total > 0
                        ? `${currency.format(donor.total)} donated historically`
                        : "No donations yet"}
                    </div>
                    <div className="text-xs text-grey-mid">Last gift {lastDonation}</div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
