"use client";

import { useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CollapsibleTransactionRow } from "./collapsible-transaction-row";
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

type FilterType = "all" | "income" | "expense" | "in-person" | "unreconciled";

type TransactionLedgerProps = {
  rows: TransactionLedgerRow[];
  onEdit?: (transaction: Doc<"transactions">) => void;
  onDelete?: (id: Id<"transactions">) => Promise<void>;
  onToggleReconciled?: (id: Id<"transactions">, next: boolean) => Promise<void>;
  onRequestReceipt?: (transaction: Doc<"transactions">) => Promise<void>;
  onSuggestCategory?: (transaction: Doc<"transactions">) => Promise<void>;
  loading?: boolean;
};

export function TransactionLedger({
  rows,
  onEdit,
  onDelete,
  loading = false,
}: TransactionLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const filteredRows = useMemo(() => {
    let filtered = rows;

    if (filterType !== "all") {
      filtered = filtered.filter((row) => {
        switch (filterType) {
          case "income":
            return row.transaction.type === "income";
          case "expense":
            return row.transaction.type === "expense";
          case "in-person":
            return row.transaction.source === "manual";
          case "unreconciled":
            return !row.transaction.reconciled;
          default:
            return true;
        }
      });
    }

    if (!searchTerm.trim()) {
      return filtered;
    }

    const search = searchTerm.toLowerCase().trim();
    return filtered.filter((row) => {
      const description = row.transaction.description.toLowerCase();
      const reference = (row.transaction.reference ?? "").toLowerCase();
      const donorName = row.donor?.name.toLowerCase() ?? "";
      const fundName = row.fund?.name.toLowerCase() ?? "";
      const enteredBy = (row.transaction.enteredByName ?? "").toLowerCase();

      return (
        description.includes(search) ||
        reference.includes(search) ||
        donorName.includes(search) ||
        fundName.includes(search) ||
        enteredBy.includes(search)
      );
    });
  }, [rows, searchTerm, filterType]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
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
  }, [filteredRows]);

  if (loading) {
    return (
      <div className="rounded-lg border border-ledger bg-paper p-6 text-sm text-grey-mid">
        Loading ledger…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-grey-mid">
            <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
              {filteredRows.length} of {rows.length} entries
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
          <div className="relative w-full sm:w-auto sm:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-mid" />
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 font-primary"
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-mid hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-grey-mid" />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              className="h-7 text-xs"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterType === "income" ? "default" : "outline"}
              onClick={() => setFilterType("income")}
              className="h-7 text-xs"
            >
              Income
            </Button>
            <Button
              size="sm"
              variant={filterType === "expense" ? "default" : "outline"}
              onClick={() => setFilterType("expense")}
              className="h-7 text-xs"
            >
              Expense
            </Button>
            <Button
              size="sm"
              variant={filterType === "in-person" ? "default" : "outline"}
              onClick={() => setFilterType("in-person")}
              className="h-7 text-xs"
            >
              In-Person
            </Button>
            <Button
              size="sm"
              variant={filterType === "unreconciled" ? "default" : "outline"}
              onClick={() => setFilterType("unreconciled")}
              className="h-7 text-xs"
            >
              Unreconciled
            </Button>
          </div>
        </div>
      </div>
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
            {filteredRows.map((row) => {
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
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
