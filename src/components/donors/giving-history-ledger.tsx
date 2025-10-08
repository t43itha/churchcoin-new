"use client";

import type { Id } from "@/lib/convexGenerated";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

type HistoryEntry = {
  date: string;
  fundName: string | null;
  amount: number;
  giftAidEligible: boolean;
  transactionId: Id<"transactions">;
};

type GivingHistoryLedgerProps = {
  history: HistoryEntry[];
  className?: string;
};

export function GivingHistoryLedger({ history, className }: GivingHistoryLedgerProps) {
  if (!history.length) {
    return (
      <div className={cn("rounded-lg border border-ledger bg-paper px-4 py-6 text-sm text-grey-mid", className)}>
        <p className="text-center text-grey-mid">No giving history yet</p>
      </div>
    );
  }

  const totals = history.reduce(
    (acc, entry) => {
      acc.amount += entry.amount;
      if (entry.giftAidEligible) {
        acc.giftAid += entry.amount;
      }
      return acc;
    },
    { amount: 0, giftAid: 0 },
  );

  return (
    <div className={cn("overflow-hidden rounded-lg border border-ledger bg-paper", className)}>
      <table className="min-w-full divide-y divide-ledger">
        <thead className="bg-ledger/60">
          <tr className="text-left text-xs uppercase tracking-wide text-grey-mid">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Fund</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 text-center">Gift Aid</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr key={entry.transactionId} className="border-t border-ledger/70 text-sm text-ink hover:bg-highlight/40">
              <td className="px-4 py-3 font-mono text-xs text-grey-mid">
                {dateFormatter.format(new Date(entry.date))}
              </td>
              <td className="px-4 py-3 text-sm">{entry.fundName ?? "—"}</td>
              <td className="px-4 py-3 text-right font-medium text-success">
                {currency.format(entry.amount)}
              </td>
              <td className="px-4 py-3 text-center text-sm">
                {entry.giftAidEligible ? "✓" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-ledger/40 text-sm font-medium text-ink">
          <tr>
            <td className="px-4 py-3" colSpan={2}>
              Totals
            </td>
            <td className="px-4 py-3 text-right">{currency.format(totals.amount)}</td>
            <td className="px-4 py-3 text-center">{currency.format(totals.giftAid)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
