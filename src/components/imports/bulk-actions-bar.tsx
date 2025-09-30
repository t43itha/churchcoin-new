"use client";

import { Building2, FolderOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onAssignFund: () => void;
  onAssignCategory: () => void;
  onAssignDonor: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onAssignFund,
  onAssignCategory,
  onAssignDonor,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="mx-auto max-w-6xl px-6 pb-6">
        <div className="rounded-lg border-2 border-ink bg-paper shadow-lg">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Selection Summary */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-paper">
                <span className="font-mono text-sm font-bold">{selectedCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-ink">
                  {selectedCount} transaction{selectedCount !== 1 ? "s" : ""} selected
                </span>
                <span className="text-xs text-grey-mid">
                  Choose an action to apply to all selected rows
                </span>
              </div>
            </div>

            {/* Action Buttons */}
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
              <div className="h-6 w-px bg-ledger" />
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
  );
}