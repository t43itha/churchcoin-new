"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

export type FundLedgerEntry = {
  transactionId: string;
  date: string;
  description: string;
  type: "income" | "expense";
  amount: number;
  balance: number;
};

type FundLedgerProps = {
  entries: FundLedgerEntry[];
};

export function FundLedger({ entries }: FundLedgerProps) {
  if (!entries.length) {
    return (
      <div className="rounded-md border border-dashed border-ledger bg-paper px-4 py-6 text-center text-sm text-grey-mid">
        No transactions recorded for this fund yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ledger bg-paper">
      <Table>
        <TableHeader className="bg-ledger/60">
          <TableRow className="border-ledger">
            <TableHead className="text-grey-dark">Date</TableHead>
            <TableHead className="text-grey-dark">Description</TableHead>
            <TableHead className="text-right text-grey-dark">Income</TableHead>
            <TableHead className="text-right text-grey-dark">Expense</TableHead>
            <TableHead className="text-right text-grey-dark">Running Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.transactionId} className="border-ledger">
              <TableCell className="text-sm text-ink">
                {new Date(entry.date).toLocaleDateString("en-GB")}
              </TableCell>
              <TableCell className="text-sm text-ink">{entry.description}</TableCell>
              <TableCell className="text-right text-sm text-success">
                {entry.type === "income" ? currency.format(entry.amount) : "—"}
              </TableCell>
              <TableCell className="text-right text-sm text-error">
                {entry.type === "expense" ? currency.format(entry.amount) : "—"}
              </TableCell>
              <TableCell className="text-right text-sm font-medium text-ink">
                {currency.format(entry.balance)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
