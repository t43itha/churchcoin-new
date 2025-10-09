"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CollapsibleTransactionRow } from "./collapsible-transaction-row";
import type { Doc, Id } from "@/lib/convexGenerated";

export type TransactionLedgerRow = {
  transaction: Doc<"transactions">;
  fund: Doc<"funds"> | null;
  category: Doc<"categories"> | null;
  donor: Doc<"donors"> | null;
};

type TransactionLedgerProps = {
  rows: TransactionLedgerRow[];
  onEdit?: (transaction: Doc<"transactions">) => void;
  onDelete?: (id: Id<"transactions">) => Promise<void>;
  onToggleReconciled?: (id: Id<"transactions">, next: boolean) => Promise<void>;
  onRequestReceipt?: (transaction: Doc<"transactions">) => Promise<void>;
  onSuggestCategory?: (transaction: Doc<"transactions">) => Promise<void>;
  loading?: boolean;
  totalRows?: number;
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

  if (loading) {
    return (
      <div className="rounded-lg border border-ledger bg-paper p-6 text-sm text-grey-mid">
        Loading ledger…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-ledger/30">
              <TableHead className="w-8"></TableHead>
              <TableHead className="whitespace-nowrap">Date</TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
              <TableHead className="whitespace-nowrap">Fund</TableHead>
              <TableHead className="whitespace-nowrap text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const { transaction, fund, category, donor } = row;
              return (
                <CollapsibleTransactionRow
                  key={transaction._id}
                  transaction={transaction}
                  fund={fund}
                  category={category}
                  donor={donor}
                  onEdit={onEdit ? () => onEdit(transaction) : undefined}
                  onDelete={onDelete ? () => onDelete(transaction._id) : undefined}
                  onToggleReconciled={onToggleReconciled ? (reconciled) => onToggleReconciled(transaction._id, reconciled) : undefined}
                  onRequestReceipt={onRequestReceipt ? () => onRequestReceipt(transaction) : undefined}
                  onSuggestCategory={onSuggestCategory ? () => onSuggestCategory(transaction) : undefined}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
