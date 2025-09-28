"use client";

import { useMemo, useState } from "react";

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
import type { Doc, Id } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

type CsvRow = Doc<"csvRows">;

type DuplicateReviewProps = {
  rows: CsvRow[];
  funds: Doc<"funds">[];
  categories: Doc<"categories">[];
  donors: Doc<"donors">[];
  onMarkReady: (rowId: Id<"csvRows">, fundId: Id<"funds">, categoryId?: Id<"categories">, donorId?: Id<"donors">) => void;
  onSkip: (rowId: Id<"csvRows">) => void;
  onApproveSelection: (
    selection: {
      rowId: Id<"csvRows">;
      fundId: Id<"funds">;
      categoryId?: Id<"categories">;
      donorId?: Id<"donors">;
    }[]
  ) => void;
};

export function DuplicateReview({
  rows,
  funds,
  categories,
  donors,
  onMarkReady,
  onSkip,
  onApproveSelection,
}: DuplicateReviewProps) {
  const [selected, setSelected] = useState<Record<string, { fundId: string; categoryId?: string; donorId?: string }>>({});

  const readyRows = useMemo(
    () =>
      Object.entries(selected)
        .filter(([rowId]) => rows.find((row) => row._id === rowId)?.status !== "skipped")
        .map(([rowId, config]) => ({
          rowId: rowId as Id<"csvRows">,
          fundId: config.fundId as Id<"funds">,
          categoryId: config.categoryId ? (config.categoryId as Id<"categories">) : undefined,
          donorId: config.donorId ? (config.donorId as Id<"donors">) : undefined,
        })),
    [rows, selected]
  );

  const updateSelection = (rowId: string, key: "fundId" | "categoryId" | "donorId", value: string) => {
    setSelected((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink">Review & approve</h3>
        <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
          {readyRows.length} ready to approve
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-ledger/40">
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Fund</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Donor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const config = selected[row._id] ?? { fundId: funds[0]?._id ?? "" };
            return (
              <TableRow key={row._id}>
                <TableCell>{row.raw.date}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-ink">{row.raw.description}</span>
                    {row.raw.reference ? (
                      <span className="text-xs text-grey-mid">{row.raw.reference}</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className={`text-right font-mono ${row.raw.amount >= 0 ? "text-success" : "text-error"}`}>
                  {currency.format(Math.abs(row.raw.amount))}
                </TableCell>
                <TableCell>
                  <select
                    value={config.fundId}
                    className="h-8 rounded-md border border-ledger bg-paper px-2 text-sm"
                    onChange={(event) => updateSelection(row._id, "fundId", event.target.value)}
                  >
                    {funds.map((fund) => (
                      <option key={fund._id} value={fund._id}>
                        {fund.name}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <select
                    value={config.categoryId ?? ""}
                    className="h-8 rounded-md border border-ledger bg-paper px-2 text-sm"
                    onChange={(event) => updateSelection(row._id, "categoryId", event.target.value)}
                  >
                    <option value="">Auto-detect</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <select
                    value={config.donorId ?? ""}
                    className="h-8 rounded-md border border-ledger bg-paper px-2 text-sm"
                    onChange={(event) => updateSelection(row._id, "donorId", event.target.value)}
                  >
                    <option value="">No donor</option>
                    {donors.map((donor) => (
                      <option key={donor._id} value={donor._id}>
                        {donor.name}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`border-ledger ${
                      row.status === "duplicate"
                        ? "bg-error/10 text-error"
                        : row.status === "approved"
                        ? "bg-success/10 text-success"
                        : "bg-highlight text-ink"
                    }`}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-ledger"
                    onClick={() => {
                      if (!config.fundId) return;
                      onMarkReady(
                        row._id,
                        config.fundId as Id<"funds">,
                        config.categoryId ? (config.categoryId as Id<"categories">) : undefined,
                        config.donorId ? (config.donorId as Id<"donors">) : undefined
                      );
                    }}
                  >
                    Mark ready
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error"
                    onClick={() => onSkip(row._id)}
                  >
                    Skip
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Button
          className="border-ledger bg-ink text-paper"
          disabled={readyRows.length === 0}
          onClick={() => onApproveSelection(readyRows)}
        >
          Approve selected rows
        </Button>
      </div>
    </div>
  );
}
