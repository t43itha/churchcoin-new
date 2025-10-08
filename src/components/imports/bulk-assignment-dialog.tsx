"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Doc, Id } from "@/lib/convexGenerated";
import { formatUkDateWithMonth } from "@/lib/dates";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

type CsvRow = Doc<"csvRows">;

type SubcategoryWithParent = {
  _id: Id<"categories">;
  name: string;
  type: "income" | "expense";
  parentName?: string;
  displayName: string;
};

type BulkAssignmentType = "fund" | "category" | "donor";

interface BulkAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: BulkAssignmentType;
  selectedRows: CsvRow[];
  funds?: Doc<"funds">[];
  categories?: SubcategoryWithParent[];
  donors?: Doc<"donors">[];
  onConfirm: (value: string) => void;
}

export function BulkAssignmentDialog({
  open,
  onOpenChange,
  type,
  selectedRows,
  funds = [],
  categories = [],
  donors = [],
  onConfirm,
}: BulkAssignmentDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>("");

  const handleConfirm = () => {
    if (selectedValue) {
      // Convert special values back to empty strings for category/donor
      let valueToPass = selectedValue;
      if (selectedValue === "__auto_detect" || selectedValue === "__no_donor") {
        valueToPass = "";
      }
      onConfirm(valueToPass);
      setSelectedValue("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedValue("");
    onOpenChange(false);
  };

  const getTitle = () => {
    switch (type) {
      case "fund":
        return "Assign Fund to Selected Transactions";
      case "category":
        return "Assign Category to Selected Transactions";
      case "donor":
        return "Assign Donor to Selected Transactions";
    }
  };

  const getDescription = () => {
    return `Select a ${type} to assign to all ${selectedRows.length} selected transaction${selectedRows.length !== 1 ? "s" : ""}. This will overwrite any existing assignments.`;
  };

  const renderOptions = () => {
    switch (type) {
      case "fund":
        return (
          <>
            {funds.map((fund) => (
              <SelectItem key={fund._id} value={fund._id}>
                {fund.name}
              </SelectItem>
            ))}
          </>
        );
      case "category": {
        // Determine transaction types in selected rows
        const hasIncome = selectedRows.some((row) => row.raw.amount >= 0);
        const hasExpense = selectedRows.some((row) => row.raw.amount < 0);

        // Filter categories based on transaction types
        const filteredCategories = categories.filter((category) => {
          if (hasIncome && hasExpense) {
            // Mixed types - show all categories
            return true;
          } else if (hasIncome) {
            return category.type === "income";
          } else if (hasExpense) {
            return category.type === "expense";
          }
          return true;
        });

        return (
          <>
            <SelectItem value="__auto_detect">Auto-detect</SelectItem>
            {filteredCategories.map((category) => (
              <SelectItem key={category._id} value={category._id}>
                {category.name}
              </SelectItem>
            ))}
          </>
        );
      }
      case "donor":
        return (
          <>
            <SelectItem value="__no_donor">No donor</SelectItem>
            {donors.map((donor) => (
              <SelectItem key={donor._id} value={donor._id}>
                {donor.name}
              </SelectItem>
            ))}
          </>
        );
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case "fund":
        return "Select a fund...";
      case "category":
        return "Select a category...";
      case "donor":
        return "Select a donor...";
    }
  };

  // Show first 5 rows as preview
  const previewRows = selectedRows.slice(0, 5);
  const remainingCount = selectedRows.length - previewRows.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-primary max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-ink">{getTitle()}</DialogTitle>
          <DialogDescription className="text-grey-mid">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Selection Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink">
              {type === "fund" ? "Fund" : type === "category" ? "Category" : "Donor"}
            </label>
            <Select value={selectedValue} onValueChange={setSelectedValue}>
              <SelectTrigger className="font-primary border-ledger bg-paper text-ink w-full">
                <SelectValue placeholder={getPlaceholder()} />
              </SelectTrigger>
              <SelectContent className="font-primary">
                {renderOptions()}
              </SelectContent>
            </Select>
          </div>

          {/* Preview of affected transactions */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink">
              Affected Transactions
            </label>
            <div className="rounded-md border border-ledger bg-highlight/20 p-3 max-h-64 overflow-y-auto">
              <div className="space-y-2 text-sm">
                {previewRows.map((row) => (
                  <div
                    key={row._id}
                    className="flex items-center justify-between gap-4 border-b border-ledger pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-ink truncate">
                        {row.raw.description}
                      </span>
                      <span className="text-xs text-grey-mid">{formatUkDateWithMonth(row.raw.date) || "—"}</span>
                    </div>
                    <span
                      className={`font-mono flex-shrink-0 ${
                        row.raw.amount >= 0 ? "text-success" : "text-error"
                      }`}
                    >
                      {currency.format(Math.abs(row.raw.amount))}
                    </span>
                  </div>
                ))}
                {remainingCount > 0 && (
                  <div className="pt-2 text-center text-xs text-grey-mid">
                    ...and {remainingCount} more transaction{remainingCount !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warning Badge */}
          <div className="flex">
            <Badge variant="outline" className="border-ledger text-grey-mid text-xs">
              ⚠️ This will overwrite existing {type} assignments for these transactions
            </Badge>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-ledger text-ink hover:bg-highlight"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedValue && type === "fund"}
            className="bg-ink text-paper hover:bg-grey-dark whitespace-nowrap"
          >
            Assign to {selectedRows.length} transaction{selectedRows.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}