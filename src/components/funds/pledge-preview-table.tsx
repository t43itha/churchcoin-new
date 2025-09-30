"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, UserPlus, Target } from "lucide-react";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Id } from "@/lib/convexGenerated";

export type PledgePreviewRow = {
  rowIndex: number;
  parsed: {
    donorName: string;
    donorEmail?: string;
    amount: number;
    pledgedDate: string;
    dueDate?: string;
    notes?: string;
  };
  matchedDonor?: {
    id: Id<"donors">;
    name: string;
    confidence: "high" | "medium" | "low";
  };
  status: "ready" | "no-match" | "duplicate" | "error";
  error?: string;
  action: "create" | "skip";
};

type PledgePreviewTableProps = {
  rows: PledgePreviewRow[];
  fundName: string;
  onBulkCreate: (rowsToCreate: PledgePreviewRow[]) => Promise<void>;
  onBack: () => void;
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function PledgePreviewTable({
  rows,
  fundName,
  onBulkCreate,
  onBack,
}: PledgePreviewTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(
    new Set(rows.filter((r) => r.status === "ready").map((r) => r.rowIndex))
  );
  const [isCreating, setIsCreating] = useState(false);

  const stats = useMemo(() => {
    const toCreate = rows.filter((r) => selectedRows.has(r.rowIndex));
    const toSkip = rows.filter((r) => !selectedRows.has(r.rowIndex));
    const noMatch = rows.filter((r) => r.status === "no-match");
    const duplicates = rows.filter((r) => r.status === "duplicate");
    const totalAmount = toCreate.reduce((sum, r) => sum + r.parsed.amount, 0);

    return {
      total: rows.length,
      toCreate: toCreate.length,
      toSkip: toSkip.length,
      noMatch: noMatch.length,
      duplicates: duplicates.length,
      totalAmount,
    };
  }, [rows, selectedRows]);

  const handleToggleRow = (rowIndex: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedRows.size === rows.filter(r => r.status === "ready").length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.filter(r => r.status === "ready").map((r) => r.rowIndex)));
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const rowsToCreate = rows.filter((r) => selectedRows.has(r.rowIndex));
      await onBulkCreate(rowsToCreate);
    } finally {
      setIsCreating(false);
    }
  };

  const getConfidenceBadge = (confidence: "high" | "medium" | "low") => {
    const colors = {
      high: "border-success/40 bg-success/10 text-success",
      medium: "border-highlight/40 bg-highlight text-grey-dark",
      low: "border-error/40 bg-error/10 text-error",
    };
    return (
      <Badge variant="secondary" className={`${colors[confidence]} text-xs`}>
        {confidence === "high" ? "✓" : confidence === "medium" ? "~" : "?"} {confidence}
      </Badge>
    );
  };

  return (
    <Card className="border-ledger bg-paper shadow-none">
      <CardHeader>
        <CardTitle className="text-ink">Preview pledge import for {fundName}</CardTitle>
        <CardDescription className="text-grey-mid">
          Review matched donors and amounts before final import. Unmatched donors won&apos;t be imported.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-grey-mid">
          <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
            <Target className="mr-1 h-3 w-3" />
            {stats.total} pledges
          </Badge>
          <Badge variant="secondary" className="border-ledger bg-success/20 text-success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {stats.toCreate} to create · {currency.format(stats.totalAmount)}
          </Badge>
          <Badge variant="secondary" className="border-ledger bg-grey-light/20 text-grey-dark">
            {stats.toSkip} to skip
          </Badge>
          {stats.noMatch > 0 ? (
            <Badge variant="secondary" className="border-ledger bg-error/20 text-error">
              <AlertCircle className="mr-1 h-3 w-3" />
              {stats.noMatch} no donor match
            </Badge>
          ) : null}
          {stats.duplicates > 0 ? (
            <Badge variant="secondary" className="border-ledger bg-error/20 text-error">
              {stats.duplicates} duplicates
            </Badge>
          ) : null}
        </div>

        <div className="max-h-[500px] overflow-auto rounded-md border border-ledger">
          <Table>
            <TableHeader className="sticky top-0 bg-ledger/30">
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === rows.filter(r => r.status === "ready").length}
                    onChange={handleToggleAll}
                    className="h-4 w-4 rounded border-ledger accent-ink"
                  />
                </TableHead>
                <TableHead>Row</TableHead>
                <TableHead>Donor Name</TableHead>
                <TableHead>Matched Donor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Pledged Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isSelected = selectedRows.has(row.rowIndex);
                const canSelect = row.status === "ready";

                return (
                  <TableRow
                    key={row.rowIndex}
                    className={
                      row.status === "no-match" || row.status === "error"
                        ? "bg-error/5"
                        : row.status === "duplicate"
                        ? "bg-highlight/30"
                        : isSelected
                        ? "bg-success/5"
                        : undefined
                    }
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!canSelect}
                        onChange={() => handleToggleRow(row.rowIndex)}
                        className="h-4 w-4 rounded border-ledger accent-ink disabled:opacity-30"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-grey-mid">{row.rowIndex + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-ink">{row.parsed.donorName}</span>
                        {row.parsed.donorEmail ? (
                          <span className="text-xs text-grey-mid">{row.parsed.donorEmail}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.matchedDonor ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-ink">{row.matchedDonor.name}</span>
                          {getConfidenceBadge(row.matchedDonor.confidence)}
                        </div>
                      ) : (
                        <span className="text-sm text-grey-mid">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-ink">
                      {currency.format(row.parsed.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-grey-mid">{row.parsed.pledgedDate}</TableCell>
                    <TableCell>
                      {row.status === "no-match" ? (
                        <Badge variant="secondary" className="border-error/40 bg-error/10 text-error w-fit">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          No donor match
                        </Badge>
                      ) : row.status === "duplicate" ? (
                        <Badge variant="secondary" className="border-highlight/40 bg-highlight text-grey-dark w-fit">
                          Already pledged
                        </Badge>
                      ) : row.status === "error" ? (
                        <Badge variant="secondary" className="border-error/40 bg-error/10 text-error w-fit">
                          {row.error}
                        </Badge>
                      ) : isSelected ? (
                        <Badge variant="secondary" className="border-success/40 bg-success/10 text-success w-fit">
                          <UserPlus className="mr-1 h-3 w-3" />
                          Will create
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="border-ledger bg-grey-light/20 text-grey-dark w-fit">
                          Skipped
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ledger pt-4">
          <Button variant="outline" onClick={onBack} disabled={isCreating}>
            Back to mapping
          </Button>
          <Button
            className="border-ledger bg-ink text-paper"
            onClick={handleCreate}
            disabled={stats.toCreate === 0 || isCreating}
          >
            {isCreating ? "Creating..." : `Create ${stats.toCreate} pledge${stats.toCreate === 1 ? "" : "s"}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
