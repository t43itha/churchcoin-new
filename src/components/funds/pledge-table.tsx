"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUkDateNumeric } from "@/lib/dates";
import { type FundSupporter } from "./types";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

const statusTone: Record<FundSupporter["computedStatus"], string> = {
  open: "border border-highlight/40 bg-highlight/30 text-grey-dark",
  fulfilled: "border border-success/40 bg-success/10 text-success",
  cancelled: "border border-error/40 bg-error/10 text-error",
};

type PledgeTableProps = {
  supporters: FundSupporter[];
  emptyMessage?: string;
};

export function PledgeTable({ supporters, emptyMessage }: PledgeTableProps) {
  if (supporters.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ledger bg-paper px-4 py-6 text-center text-sm text-grey-mid">
        {emptyMessage ?? "No pledges recorded yet."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ledger bg-paper">
      <div className="max-h-[540px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-ledger/60">
            <TableRow className="border-ledger">
              <TableHead className="text-xs uppercase tracking-wide text-grey-dark">Donor</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-grey-dark">Pledged</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-grey-dark">Donated</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-grey-dark">Outstanding</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-grey-dark">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-grey-dark">Last donation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supporters.map((supporter) => (
              <TableRow key={supporter.pledgeId} className="border-ledger transition-colors hover:bg-highlight/40">
                <TableCell className="min-w-[200px] text-sm text-ink">
                  <div className="font-medium text-ink">{supporter.donorName}</div>
                  <div className="text-xs text-grey-mid">
                    Pledged {formatUkDateNumeric(supporter.pledgedAt) || "—"}
                    {supporter.dueDate ? ` · Due ${formatUkDateNumeric(supporter.dueDate) || "—"}` : null}
                  </div>
                  {supporter.notes ? (
                    <p className="mt-1 text-xs text-grey-mid">{supporter.notes}</p>
                  ) : null}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm text-ink">
                  {currency.format(supporter.amountPledged)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm text-success">
                  {currency.format(supporter.amountDonated)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm text-error">
                  {currency.format(supporter.outstandingAmount)}
                </TableCell>
                <TableCell className="text-sm">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusTone[supporter.computedStatus]}`}>
                    {supporter.computedStatus}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-grey-mid">
                  {supporter.lastDonationDate ? formatUkDateNumeric(supporter.lastDonationDate) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
