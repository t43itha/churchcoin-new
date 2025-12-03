"use client";

import { memo, useMemo } from "react";
import type { Id } from "@/lib/convexGenerated";
import { formatCurrency } from "@/lib/formats";
import { formatUkDateWithMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Safely format a date string, returning a fallback if invalid
 */
function formatDateSafe(dateString: string): string {
  const formatted = formatUkDateWithMonth(dateString);
  return formatted || "—";
}

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

/**
 * Giving history ledger component - memoized for performance.
 * Displays a table of donor giving history with totals.
 */
export const GivingHistoryLedger = memo(function GivingHistoryLedger({ history, className }: GivingHistoryLedgerProps) {
  // Memoize totals calculation to avoid recalculating on every render
  const totals = useMemo(() => {
    return history.reduce(
      (acc, entry) => {
        acc.amount += entry.amount;
        if (entry.giftAidEligible) {
          acc.giftAid += entry.amount;
        }
        return acc;
      },
      { amount: 0, giftAid: 0 }
    );
  }, [history]);

  if (!history.length) {
    return (
      <div className={cn("swiss-card rounded-lg border border-ink bg-white px-4 py-8 text-sm", className)}>
        <p className="text-center text-grey-mid">No giving history yet</p>
      </div>
    );
  }

  return (
    <div className={cn("swiss-card overflow-hidden rounded-lg border border-ink bg-white", className)}>
      <div className="border-b border-ink/10 bg-ink/5 px-4 py-3">
        <h3 className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid">Giving History</h3>
      </div>
      <table className="min-w-full divide-y divide-ink/10">
        <thead className="bg-ink/5">
          <tr className="text-left text-[10px] uppercase tracking-widest text-grey-mid">
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Fund</th>
            <th className="px-4 py-3 text-right font-semibold">Amount</th>
            <th className="px-4 py-3 text-center font-semibold">Gift Aid</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr key={entry.transactionId} className="border-t border-ink/10 text-sm text-ink hover:bg-sage-light/30 transition-colors">
              <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-grey-mid">
                {formatDateSafe(entry.date)}
              </td>
              <td className="px-4 py-3 text-sm">{entry.fundName ?? "—"}</td>
              <td className="px-4 py-3 text-right font-medium text-sage font-[family-name:var(--font-mono)]">
                {formatCurrency(entry.amount)}
              </td>
              <td className="px-4 py-3 text-center text-sm">
                {entry.giftAidEligible ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sage-light text-sage-dark text-xs font-semibold">✓</span>
                ) : (
                  <span className="text-grey-mid">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-ink text-sm font-medium text-white">
          <tr>
            <td className="px-4 py-3 font-semibold" colSpan={2}>
              Totals
            </td>
            <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)]">{formatCurrency(totals.amount)}</td>
            <td className="px-4 py-3 text-center font-[family-name:var(--font-mono)]">{formatCurrency(totals.giftAid)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
});
