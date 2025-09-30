"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileText, Pencil, Sparkles, Trash2, Undo2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUkDateNumeric } from "@/lib/dates";
import type { Doc, Id } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export type TransactionLedgerRow = {
  transaction: Doc<"transactions">;
  fund: Doc<"funds"> | null;
  category: Doc<"categories"> | null;
  donor: Doc<"donors"> | null;
};

type TransactionLedgerProps = {
  rows: TransactionLedgerRow[];
  onEdit: (transaction: Doc<"transactions">) => void;
  onDelete: (id: Id<"transactions">) => Promise<void>;
  onToggleReconciled: (id: Id<"transactions">, next: boolean) => Promise<void>;
  onRequestReceipt?: (transaction: Doc<"transactions">) => Promise<void>;
  onSuggestCategory?: (transaction: Doc<"transactions">) => Promise<void>;
  loading?: boolean;
};

export function TransactionLedger({
  rows,
  onEdit,
  onDelete,
  onToggleReconciled,
  onRequestReceipt,
  onSuggestCategory,
  loading = false,
}: TransactionLedgerProps) {
  const [deletingId, setDeletingId] = useState<Id<"transactions"> | null>(null);
  const [togglingId, setTogglingId] = useState<Id<"transactions"> | null>(null);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (row.transaction.type === "income") {
          acc.income += row.transaction.amount;
        } else {
          acc.expense += row.transaction.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [rows]);

  if (loading) {
    return (
      <div className="rounded-lg border border-ledger bg-paper p-6 text-sm text-grey-mid">
        Loading ledger…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-grey-mid">
        <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
          {rows.length} entries
        </Badge>
        <Badge variant="secondary" className="border-ledger bg-highlight text-success">
          Income {currency.format(totals.income)}
        </Badge>
        <Badge variant="secondary" className="border-ledger bg-highlight text-error">
          Expenses {currency.format(totals.expense)}
        </Badge>
        <span className="text-xs text-grey-mid">
          Net {currency.format(totals.income - totals.expense)}
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-ledger/30">
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Fund</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Donor</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const { transaction, fund, category, donor } = row;
            const reconciled = transaction.reconciled;
            return (
              <TableRow
                key={transaction._id}
                className={reconciled ? "bg-success/5" : undefined}
              >
                <TableCell>{formatUkDateNumeric(transaction.date) || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-ink">{transaction.description}</span>
                    <span className="text-xs text-grey-mid">
                      {transaction.method ? `${transaction.method.toUpperCase()} · ` : ""}
                      {transaction.reference ?? "Manual entry"}
                    </span>
                    {transaction.notes ? (
                      <span className="text-xs text-grey-mid">{transaction.notes}</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{fund ? fund.name : "—"}</TableCell>
                <TableCell>{category ? category.name : "—"}</TableCell>
                <TableCell>{donor ? donor.name : transaction.enteredByName ?? "—"}</TableCell>
                <TableCell className={`text-right font-mono ${transaction.type === "income" ? "text-success" : "text-error"}`}>
                  {transaction.type === "income" ? "" : "-"}
                  {currency.format(transaction.amount)}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  {!category && onSuggestCategory ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => onSuggestCategory(transaction)}
                    >
                      <Sparkles className="mr-1 h-3.5 w-3.5" /> Suggest
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => onEdit(transaction)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={togglingId === transaction._id}
                    onClick={async () => {
                      setTogglingId(transaction._id);
                      await onToggleReconciled(transaction._id, !reconciled);
                      setTogglingId(null);
                    }}
                  >
                    {reconciled ? (
                      <Undo2 className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    )}
                    {reconciled ? "Unreconcile" : "Reconcile"}
                  </Button>
                  {transaction.receiptStorageId && onRequestReceipt ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => onRequestReceipt(transaction)}
                    >
                      <FileText className="mr-1 h-3.5 w-3.5" /> Receipt
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-error"
                    disabled={deletingId === transaction._id}
                    onClick={async () => {
                      setDeletingId(transaction._id);
                      await onDelete(transaction._id);
                      setDeletingId(null);
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
