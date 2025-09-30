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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import type { Doc, Id } from "@/lib/convexGenerated";

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

type DuplicateReviewProps = {
  rows: CsvRow[];
  funds: Doc<"funds">[];
  categories: SubcategoryWithParent[];
  donors: Doc<"donors">[];
  onApproveSelection: (
    selection: {
      rowId: Id<"csvRows">;
      fundId: Id<"funds">;
      categoryId?: Id<"categories">;
      donorId?: Id<"donors">;
    }[]
  ) => void;
  onSkipSelection: (rowIds: Id<"csvRows">[]) => void;
};

export function DuplicateReview({
  rows,
  funds,
  categories,
  donors,
  onApproveSelection,
  onSkipSelection,
}: DuplicateReviewProps) {
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Record<string, { fundId: string; categoryId?: string; donorId?: string }>>({});

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Filter rows based on search and filter criteria
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Search filter - check description and reference
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = row.raw.description.toLowerCase().includes(query);
        const matchesReference = row.raw.reference?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesReference) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter && categoryFilter !== "__all_categories") {
        const rowConfig = selected[row._id];
        if (rowConfig?.categoryId !== categoryFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter && statusFilter !== "__all_status" && row.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [rows, searchQuery, categoryFilter, statusFilter, selected]);

  const readyRows = useMemo(
    () =>
      Array.from(checkedRows)
        .filter((rowId) => {
          const row = filteredRows.find((row) => row._id === rowId);
          return row && row.status !== "skipped" && row.status !== "approved";
        })
        .map((rowId) => {
          const config = selected[rowId] || { fundId: funds[0]?._id || "" };
          return {
            rowId: rowId as Id<"csvRows">,
            fundId: config.fundId as Id<"funds">,
            categoryId: config.categoryId ? (config.categoryId as Id<"categories">) : undefined,
            donorId: config.donorId ? (config.donorId as Id<"donors">) : undefined,
          };
        })
        .filter((item) => item.fundId && item.fundId.length > 0),
    [checkedRows, filteredRows, selected, funds]
  );

  const checkedRowsArray = Array.from(checkedRows).filter((rowId) => {
    const row = filteredRows.find((row) => row._id === rowId);
    return row && row.status !== "skipped" && row.status !== "approved";
  });

  const handleRowCheck = (rowId: string, checked: boolean) => {
    setCheckedRows((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(rowId);
        // Auto-populate with first fund if not already set
        if (!selected[rowId] && funds.length > 0) {
          setSelected((prevSelected) => ({
            ...prevSelected,
            [rowId]: { fundId: funds[0]._id },
          }));
        }
      } else {
        newSet.delete(rowId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const availableRowIds = filteredRows
        .filter((row) => row.status !== "skipped" && row.status !== "approved")
        .map((row) => row._id);
      setCheckedRows(new Set(availableRowIds));
      // Auto-populate funds for all rows
      if (funds.length > 0) {
        const newSelected = { ...selected };
        availableRowIds.forEach((rowId) => {
          if (!newSelected[rowId]) {
            newSelected[rowId] = { fundId: funds[0]._id };
          }
        });
        setSelected(newSelected);
      }
    } else {
      setCheckedRows(new Set());
    }
  };

  const updateSelection = (rowId: string, key: "fundId" | "categoryId" | "donorId", value: string) => {
    setSelected((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [key]: value,
      },
    }));
  };

  // Helper functions for filters
  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("__all_categories");
    setStatusFilter("__all_status");
  };

  const hasActiveFilters = searchQuery.trim() || (categoryFilter && categoryFilter !== "__all_categories") || (statusFilter && statusFilter !== "__all_status");

  const allAvailableRows = filteredRows.filter((row) => row.status !== "skipped" && row.status !== "approved");
  const isAllSelected = allAvailableRows.length > 0 && allAvailableRows.every((row) => checkedRows.has(row._id));
  const isPartiallySelected = checkedRows.size > 0 && !isAllSelected;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink">Review & approve</h3>
        <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
          {readyRows.length} ready to approve
        </Badge>
      </div>
      {funds.length === 0 && (
        <div className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error">
          No funds are configured for this church. Please create at least one fund before importing transactions.
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col gap-4 rounded-md border border-ledger bg-paper p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-mid" />
            <Input
              placeholder="Search descriptions or references..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-primary border-ledger bg-paper text-ink"
            />
          </div>

          {/* Category Filter */}
          <div className="min-w-48">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="font-primary border-ledger bg-paper text-ink">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="font-primary">
                <SelectItem value="__all_categories">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="min-w-32">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="font-primary border-ledger bg-paper text-ink">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent className="font-primary">
                <SelectItem value="__all_status">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="border-ledger text-ink hover:bg-highlight"
            >
              <X className="h-4 w-4 mr-2" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Filter Results Summary */}
        <div className="flex items-center justify-between text-sm text-grey-mid">
          <span>
            Showing {filteredRows.length} of {rows.length} transactions
            {hasActiveFilters && (
              <span className="ml-2">
                • {checkedRowsArray.length} selected • {readyRows.length} ready to approve
              </span>
            )}
          </span>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex gap-2">
              {searchQuery.trim() && (
                <Badge variant="outline" className="border-ledger text-ink">
                  Search: &ldquo;{searchQuery}&rdquo;
                </Badge>
              )}
              {categoryFilter && (
                <Badge variant="outline" className="border-ledger text-ink">
                  Category: {categories.find(c => c._id === categoryFilter)?.name}
                </Badge>
              )}
              {statusFilter && (
                <Badge variant="outline" className="border-ledger text-ink">
                  Status: {statusFilter}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-ledger/40">
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                className="border-2 border-ink data-[state=checked]:bg-ink data-[state=checked]:border-ink"
                ref={(el: HTMLButtonElement | null) => {
                  if (el) {
                    (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isPartiallySelected;
                  }
                }}
              />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Fund</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Donor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((row) => {
            const config = selected[row._id] ?? { fundId: funds[0]?._id ?? "" };
            const isProcessed = row.status === "skipped" || row.status === "approved";
            const isChecked = checkedRows.has(row._id);

            return (
              <TableRow key={row._id} className={isProcessed ? "opacity-50" : ""}>
                <TableCell>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked: boolean | "indeterminate") => handleRowCheck(row._id, checked === true)}
                    disabled={isProcessed}
                    className="border-2 border-ink data-[state=checked]:bg-ink data-[state=checked]:border-ink"
                  />
                </TableCell>
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
                  {funds.length > 0 ? (
                    <select
                      value={config.fundId}
                      className="h-8 rounded-md border border-ledger bg-paper px-2 text-sm"
                      onChange={(event) => updateSelection(row._id, "fundId", event.target.value)}
                      disabled={isProcessed}
                    >
                      {funds.map((fund) => (
                        <option key={fund._id} value={fund._id}>
                          {fund.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-error">No funds available</span>
                  )}
                </TableCell>
                <TableCell>
                  <select
                    value={config.categoryId ?? ""}
                    className="h-8 rounded-md border border-ledger bg-paper px-2 text-sm"
                    onChange={(event) => updateSelection(row._id, "categoryId", event.target.value)}
                    disabled={isProcessed}
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
                    disabled={isProcessed}
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
                    variant={
                      row.status === "duplicate"
                        ? "destructive"
                        : row.status === "ready"
                        ? "default"
                        : row.status === "approved"
                        ? "secondary"
                        : row.status === "skipped"
                        ? "outline"
                        : "secondary"
                    }
                    className={`font-mono text-xs ${
                      row.status === "skipped" ? "line-through" : ""
                    }`}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex justify-between items-center">
        <div className="text-sm text-grey-mid">
          {checkedRowsArray.length} row{checkedRowsArray.length !== 1 ? "s" : ""} selected
          {hasActiveFilters && ` (from ${filteredRows.length} filtered)`}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-ledger"
            disabled={checkedRowsArray.length === 0}
            onClick={() => onSkipSelection(checkedRowsArray as Id<"csvRows">[])}
          >
            Skip Selected
          </Button>
          <Button
            className="border-ledger bg-ink text-paper"
            disabled={readyRows.length === 0 || funds.length === 0}
            onClick={() => onApproveSelection(readyRows)}
          >
            Approve Selected ({readyRows.length})
          </Button>
        </div>
      </div>
    </div>
  );
}