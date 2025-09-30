"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, UserPlus } from "lucide-react";

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
import type { Doc, Id } from "@/lib/convexGenerated";

export type DonorPreviewRow = {
  rowIndex: number;
  parsed: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    bankReference?: string;
    giftAidSigned?: boolean;
    giftAidDate?: string;
    notes?: string;
  };
  duplicateOf?: Id<"donors">;
  duplicateReason?: string;
  action: "create" | "skip";
};

type DonorPreviewTableProps = {
  rows: DonorPreviewRow[];
  existingDonors: Doc<"donors">[];
  onBulkCreate: (rowsToCreate: DonorPreviewRow[]) => Promise<void>;
  onBack: () => void;
};

export function DonorPreviewTable({
  rows,
  existingDonors,
  onBulkCreate,
  onBack,
}: DonorPreviewTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(
    new Set(rows.filter((r) => r.action === "create").map((r) => r.rowIndex))
  );
  const [isCreating, setIsCreating] = useState(false);

  const donorLookup = useMemo(() => {
    return new Map(existingDonors.map((donor) => [donor._id, donor]));
  }, [existingDonors]);

  const stats = useMemo(() => {
    const toCreate = rows.filter((r) => selectedRows.has(r.rowIndex));
    const toSkip = rows.filter((r) => !selectedRows.has(r.rowIndex));
    const duplicates = rows.filter((r) => r.duplicateOf);

    return {
      total: rows.length,
      toCreate: toCreate.length,
      toSkip: toSkip.length,
      duplicates: duplicates.length,
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
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((r) => r.rowIndex)));
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

  return (
    <Card className="border-ledger bg-paper shadow-none">
      <CardHeader>
        <CardTitle className="text-ink">Preview donor import</CardTitle>
        <CardDescription className="text-grey-mid">
          Review parsed donors and resolve duplicates before final import.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-grey-mid">
          <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
            {stats.total} rows
          </Badge>
          <Badge variant="secondary" className="border-ledger bg-success/20 text-success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {stats.toCreate} to create
          </Badge>
          <Badge variant="secondary" className="border-ledger bg-grey-light/20 text-grey-dark">
            {stats.toSkip} to skip
          </Badge>
          {stats.duplicates > 0 ? (
            <Badge variant="secondary" className="border-ledger bg-error/20 text-error">
              <AlertCircle className="mr-1 h-3 w-3" />
              {stats.duplicates} duplicates detected
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
                    checked={selectedRows.size === rows.length}
                    onChange={handleToggleAll}
                    className="h-4 w-4 rounded border-ledger accent-ink"
                  />
                </TableHead>
                <TableHead>Row</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Bank Ref</TableHead>
                <TableHead>Gift Aid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const duplicate = row.duplicateOf ? donorLookup.get(row.duplicateOf) : null;
                const isSelected = selectedRows.has(row.rowIndex);

                return (
                  <TableRow
                    key={row.rowIndex}
                    className={duplicate ? "bg-error/5" : isSelected ? "bg-success/5" : undefined}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(row.rowIndex)}
                        className="h-4 w-4 rounded border-ledger accent-ink"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-grey-mid">{row.rowIndex + 1}</TableCell>
                    <TableCell className="font-medium text-ink">{row.parsed.name}</TableCell>
                    <TableCell className="text-sm text-grey-mid">{row.parsed.email ?? "—"}</TableCell>
                    <TableCell className="text-sm text-grey-mid">{row.parsed.bankReference ?? "—"}</TableCell>
                    <TableCell className="text-sm text-grey-mid">
                      {row.parsed.giftAidSigned ? (
                        <Badge variant="secondary" className="border-success/40 bg-success/10 text-success">
                          Yes
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {duplicate ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="border-error/40 bg-error/10 text-error w-fit">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Duplicate
                          </Badge>
                          <span className="text-xs text-grey-mid">{row.duplicateReason}</span>
                        </div>
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
            {isCreating ? "Creating..." : `Create ${stats.toCreate} donor${stats.toCreate === 1 ? "" : "s"}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
