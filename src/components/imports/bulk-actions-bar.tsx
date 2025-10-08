"use client";

import { Building2, FolderOpen, User } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SelectionTotals {
  income: number;
  expense: number;
}

interface BulkActionsBarProps {
  selectedCount: number;
  selectionTotals: SelectionTotals;
  onClearSelection: () => void;
  onAssignFund: () => void;
  onAssignCategory: () => void;
  onAssignDonor: () => void;
  onSkipSelected: () => void;
  onApproveSelected: () => void;
  disableSkip?: boolean;
  disableApprove?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  selectionTotals,
  onClearSelection,
  onAssignFund,
  onAssignCategory,
  onAssignDonor,
  onSkipSelected,
  onApproveSelected,
  disableSkip = false,
  disableApprove = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  const net = selectionTotals.income - selectionTotals.expense;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="mx-auto max-w-6xl px-6 pb-6">
        <div className="rounded-lg border-2 border-ink bg-paper shadow-lg">
          <div className="flex flex-col gap-6 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper">
                <span className="font-mono text-base font-bold">{selectedCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-ink">
                  {selectedCount} transaction{selectedCount !== 1 ? "s" : ""} selected
                </span>
                <span className="text-xs text-grey-mid">
                  Income {formatCurrency(selectionTotals.income)} · Expenses {formatCurrency(selectionTotals.expense)} · Net {formatCurrency(net)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAssignFund}
                  className="border-ledger text-ink hover:bg-highlight font-primary"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Assign Fund
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAssignCategory}
                  className="border-ledger text-ink hover:bg-highlight font-primary"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Assign Category
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAssignDonor}
                  className="border-ledger text-ink hover:bg-highlight font-primary"
                >
                  <User className="mr-2 h-4 w-4" />
                  Assign Donor
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-ledger text-grey-mid hover:text-ink"
                  onClick={onSkipSelected}
                  disabled={disableSkip}
                >
                  Skip Selected
                </Button>
                <Button
                  size="sm"
                  className="border-ledger bg-ink text-paper hover:bg-ink/90"
                  onClick={onApproveSelected}
                  disabled={disableApprove}
                >
                  Approve Selected ({selectedCount})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="text-grey-mid hover:text-ink font-primary"
                >
                  Clear selection
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  const formatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  });

  return formatter.format(value);
}
