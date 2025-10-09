"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Check,
  Search,
  Sparkles,
} from "lucide-react";
import { formatUkDateWithMonth } from "@/lib/dates";

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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Doc, Id } from "@/lib/convexGenerated";
import { BulkActionsBar } from "./bulk-actions-bar";
import { BulkAssignmentDialog } from "./bulk-assignment-dialog";
import { ConfidenceBadge } from "./confidence-badge";

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
  onAutoApprove?: () => Promise<{ approvedCount: number; skippedCount: number }>;
};

type BulkAssignmentType = "fund" | "category" | "donor";

export function DuplicateReview({
  rows,
  funds,
  categories,
  donors,
  onApproveSelection,
  onSkipSelection,
  onAutoApprove,
}: DuplicateReviewProps) {
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ [key: string]: { fundId: string; categoryId?: string; donorId?: string } }>({});
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDialogType, setBulkDialogType] = useState<BulkAssignmentType>("fund");
  const [bulkAssignments, setBulkAssignments] = useState<{
    fund: Set<string>;
    category: Set<string>;
    donor: Set<string>;
  }>({
    fund: new Set(),
    category: new Set(),
    donor: new Set(),
  });
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "skipped">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [autoApproving, setAutoApproving] = useState(false);

  // Popover states for searchable dropdowns (keyed by rowId_fieldType)
  const [openPopovers, setOpenPopovers] = useState<{ [key: string]: boolean }>({});

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Apply search query
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = row.raw.description.toLowerCase().includes(query);
        const matchesReference = row.raw.reference?.toLowerCase().includes(query);
        const matchesDate = row.raw.date?.toLowerCase().includes(query);
        const matchesAmount = row.raw.amount?.toString().includes(query);
        if (!matchesDescription && !matchesReference && !matchesDate && !matchesAmount) {
          return false;
        }
      }

      // Apply type filter
      if (typeFilter !== "all") {
        const rowType = row.raw.amount >= 0 ? "income" : "expense";
        if (rowType !== typeFilter) {
          return false;
        }
      }

      // Apply status filter
      if (statusFilter !== "all") {
        if (!row.status && statusFilter !== "pending") {
          return false;
        }
        if (row.status && row.status !== statusFilter) {
          return false;
        }
      }

      // Apply category filter
      if (categoryFilter) {
        const rowCategoryId = selected[row._id]?.categoryId || row.detectedCategoryId;
        if (rowCategoryId !== categoryFilter) {
          return false;
        }
      }

      // Apply confidence filter
      if (confidenceFilter !== "all") {
        const confidences: number[] = [];
        if (row.donorConfidence !== undefined) confidences.push(row.donorConfidence);
        if (row.categoryConfidence !== undefined) confidences.push(row.categoryConfidence);
        const avgConfidence = confidences.length > 0 ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0;

        if (confidenceFilter === "high" && avgConfidence < 0.95) return false;
        if (confidenceFilter === "medium" && (avgConfidence < 0.7 || avgConfidence >= 0.95)) return false;
        if (confidenceFilter === "low" && avgConfidence >= 0.7) return false;
      }

      return true;
    });
  }, [rows, searchQuery, typeFilter, statusFilter, categoryFilter, confidenceFilter, selected]);

  const overallTotals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const amount = Math.abs(row.raw.amount);
        if (row.raw.amount >= 0) {
          acc.income += amount;
        } else {
          acc.expense += amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [rows]);

  const highConfidenceRows = useMemo(() => {
    return filteredRows.filter((row) => {
      if (row.status !== "pending") return false;
      if (!row.detectedFundId) return false;

      const confidences: number[] = [];
      if (row.donorConfidence !== undefined) confidences.push(row.donorConfidence);
      if (row.categoryConfidence !== undefined) confidences.push(row.categoryConfidence);

      if (confidences.length === 0) return false;

      const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
      return avgConfidence >= 0.95;
    });
  }, [filteredRows]);

  const readyRows = useMemo(
    () =>
      Array.from(checkedRows)
        .filter((rowId) => {
          const row = filteredRows.find((item) => item._id === rowId);
          return row && row.status !== "skipped" && row.status !== "approved";
        })
        .map((rowId) => {
          const row = filteredRows.find((r) => r._id === rowId);
          const defaultFundId = row?.detectedFundId || funds[0]?._id || "";
          const config = selected[rowId] || { fundId: defaultFundId };
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
    const row = filteredRows.find((item) => item._id === rowId);
    return row && row.status !== "skipped" && row.status !== "approved";
  });

  const selectionTotals = useMemo(() => {
    return checkedRowsArray.reduce(
      (acc, rowId) => {
        const row = rows.find((item) => item._id === rowId);
        if (!row) return acc;
        const amount = Math.abs(row.raw.amount);
        if (row.raw.amount >= 0) {
          acc.income += amount;
        } else {
          acc.expense += amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [checkedRowsArray, rows]);

  const allAvailableRows = filteredRows.filter((row) => row.status !== "skipped" && row.status !== "approved");
  const isAllSelected = allAvailableRows.length > 0 && allAvailableRows.every((row) => checkedRows.has(row._id));
  const isPartiallySelected = checkedRows.size > 0 && !isAllSelected;

  const handleRowCheck = (rowId: string, checked: boolean) => {
    setCheckedRows((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(rowId);
        // Only set a default fund if no selection exists AND no detected fund
        if (!selected[rowId]) {
          const row = rows.find((r) => r._id === rowId);
          const defaultFundId = row?.detectedFundId || funds[0]?._id || "";
          if (defaultFundId) {
            setSelected((prevSelected) => ({
              ...prevSelected,
              [rowId]: { fundId: defaultFundId },
            }));
          }
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
      const newSelected = { ...selected };
      availableRowIds.forEach((rowId) => {
        if (!newSelected[rowId]) {
          const row = filteredRows.find((r) => r._id === rowId);
          const defaultFundId = row?.detectedFundId || funds[0]?._id || "";
          if (defaultFundId) {
            newSelected[rowId] = { fundId: defaultFundId };
          }
        }
      });
      setSelected(newSelected);
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

  const togglePopover = (rowId: string, fieldType: "category" | "donor", open: boolean) => {
    const key = `${rowId}_${fieldType}`;
    setOpenPopovers((prev) => ({
      ...prev,
      [key]: open,
    }));
  };

  const isPopoverOpen = (rowId: string, fieldType: "category" | "donor") => {
    const key = `${rowId}_${fieldType}`;
    return openPopovers[key] || false;
  };

  const handleBulkAssign = (type: BulkAssignmentType) => {
    setBulkDialogType(type);
    setBulkDialogOpen(true);
  };

  const handleBulkConfirm = (value: string) => {
    const availableRowIds = Array.from(checkedRows).filter((rowId) => {
      const row = filteredRows.find((item) => item._id === rowId);
      return row && row.status !== "skipped" && row.status !== "approved";
    });

    const newSelected = { ...selected };
    availableRowIds.forEach((rowId) => {
      if (!newSelected[rowId]) {
        const row = filteredRows.find((r) => r._id === rowId);
        const defaultFundId = row?.detectedFundId || funds[0]?._id || "";
        if (defaultFundId) {
          newSelected[rowId] = { fundId: defaultFundId };
        }
      }
      if (bulkDialogType === "fund") {
        newSelected[rowId].fundId = value;
      } else if (bulkDialogType === "category") {
        newSelected[rowId].categoryId = value || undefined;
      } else if (bulkDialogType === "donor") {
        newSelected[rowId].donorId = value || undefined;
      }
    });
    setSelected(newSelected);

    setBulkAssignments((prev) => ({
      ...prev,
      [bulkDialogType]: new Set(availableRowIds),
    }));
  };

  const handleClearSelection = () => {
    setCheckedRows(new Set());
    setBulkAssignments({
      fund: new Set(),
      category: new Set(),
      donor: new Set(),
    });
  };


  const handleAutoApprove = async () => {
    if (!onAutoApprove) return;
    setAutoApproving(true);
    try {
      await onAutoApprove();
    } catch (error) {
      console.error("Auto-approve failed:", error);
    } finally {
      setAutoApproving(false);
    }
  };

  const handleToggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const summaryCards = [
    {
      id: "total",
      label: "Total rows",
      value: rows.length.toString(),
      sublabel: `${rows.length} imported`,
      onClick: () => {
        setTypeFilter("all");
        setStatusFilter("all");
        setCategoryFilter(null);
        setConfidenceFilter("all");
      },
    },
    {
      id: "income",
      label: "Income",
      value: currency.format(overallTotals.income),
      sublabel: `${rows.filter((row) => row.raw.amount >= 0).length} transactions`,
      tone: "success" as const,
      onClick: () => setTypeFilter("income"),
    },
    {
      id: "expense",
      label: "Expenses",
      value: currency.format(overallTotals.expense),
      sublabel: `${rows.filter((row) => row.raw.amount < 0).length} transactions`,
      tone: "danger" as const,
      onClick: () => setTypeFilter("expense"),
    },
    {
      id: "confidence",
      label: "High confidence",
      value: `${highConfidenceRows.length}`,
      sublabel: "≥95% ready",
      tone: "info" as const,
      onClick: () => setConfidenceFilter("high"),
    },
  ];

  return (
    <section className="space-y-6">
      {funds.length === 0 && (
        <div className="rounded-lg border border-error bg-error/10 px-4 py-3 text-sm text-error">
          No funds are configured for this church. Please create at least one fund before importing transactions.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.id} {...card} />
        ))}
      </div>

      {onAutoApprove && highConfidenceRows.length > 0 ? (
        <div className="flex flex-col gap-4 rounded-xl border border-success/30 bg-success/5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-success">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-wide">AI suggestion</span>
            </div>
            <h3 className="text-xl font-semibold text-ink">Auto-approve high confidence matches</h3>
            <p className="text-sm text-success/80">
              {highConfidenceRows.length} transactions meet the ≥95% threshold and can be approved in one click.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <Button
              className="w-full border-success bg-ink text-paper hover:bg-ink/90 md:w-auto"
              disabled={autoApproving || funds.length === 0}
              onClick={handleAutoApprove}
            >
              {autoApproving ? "Auto-approving…" : `Auto-approve ${highConfidenceRows.length} transactions`}
            </Button>
            <Button
              variant="ghost"
              className="text-sm text-success hover:text-success/80"
              onClick={() => setConfidenceFilter("high")}
            >
              Show high confidence only
            </Button>
          </div>
        </div>
      ) : null}

      {/* Filters Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTypeFilter("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-primary transition-colors ${
              typeFilter === "all"
                ? "bg-ink text-paper"
                : "bg-paper text-grey-mid border border-ledger hover:border-ink hover:text-ink"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter("income")}
            className={`rounded-full px-4 py-1.5 text-sm font-primary transition-colors ${
              typeFilter === "income"
                ? "bg-ink text-paper"
                : "bg-paper text-grey-mid border border-ledger hover:border-ink hover:text-ink"
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setTypeFilter("expense")}
            className={`rounded-full px-4 py-1.5 text-sm font-primary transition-colors ${
              typeFilter === "expense"
                ? "bg-ink text-paper"
                : "bg-paper text-grey-mid border border-ledger hover:border-ink hover:text-ink"
            }`}
          >
            Expense
          </button>
        </div>

        {/* Right side: Status/Category/Confidence Dropdowns + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "pending" | "approved" | "skipped")}>
            <SelectTrigger className="w-[180px] border-ledger bg-paper font-primary text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="font-primary">
              <SelectItem value="all">Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter || "all"} onValueChange={(value) => setCategoryFilter(value === "all" ? null : value)}>
            <SelectTrigger className="w-[180px] border-ledger bg-paper font-primary text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="font-primary">
              <SelectItem value="all">Category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category._id} value={category._id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={confidenceFilter} onValueChange={(value) => setConfidenceFilter(value as "all" | "high" | "medium" | "low")}>
            <SelectTrigger className="w-[180px] border-ledger bg-paper font-primary text-sm">
              <SelectValue placeholder="Confidence" />
            </SelectTrigger>
            <SelectContent className="font-primary">
              <SelectItem value="all">Confidence</SelectItem>
              <SelectItem value="high">High (≥95%)</SelectItem>
              <SelectItem value="medium">Medium (70-94%)</SelectItem>
              <SelectItem value="low">Low (&lt;70%)</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-mid" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 font-primary border-ledger bg-paper"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ledger">
        <Table>
          <TableHeader>
            <TableRow className="bg-ledger/30">
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected ? true : isPartiallySelected ? "indeterminate" : false}
                  onCheckedChange={(value) => handleSelectAll(Boolean(value))}
                  className="border-2 border-ink data-[state=checked]:border-ink data-[state=checked]:bg-ink"
                />
              </TableHead>
              <TableHead className="w-32">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32 text-right">Amount</TableHead>
              <TableHead className="w-[220px]">Fund</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => {
              const isChecked = checkedRows.has(row._id);
              const isProcessed = row.status === "skipped" || row.status === "approved";
              const currentFundId = selected[row._id]?.fundId || row.detectedFundId || funds[0]?._id || "";
              const amount = currency.format(row.raw.amount);
              const amountClass = row.raw.amount >= 0 ? "text-success" : "text-error";
              const expanded = expandedRows.has(row._id);

              return (
                <Fragment key={row._id}>
                  <TableRow className={isChecked ? "bg-highlight/40" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isChecked}
                        disabled={isProcessed}
                        onCheckedChange={(value) => handleRowCheck(row._id, Boolean(value))}
                        className="border-2 border-ink data-[state=checked]:border-ink data-[state=checked]:bg-ink"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-grey-mid">
                      {formatUkDateWithMonth(row.raw.date) || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink">{row.raw.description}</span>
                          <RowStatusBadge status={row.status} />
                        </div>
                        {row.duplicateOf ? (
                          <p className="text-xs text-error">
                            Potential duplicate detected
                          </p>
                        ) : null}
                        {row.raw.reference ? (
                          <p className="text-xs text-grey-mid">Ref: {row.raw.reference}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium ${amountClass}`}>{amount}</TableCell>
                    <TableCell>
                      <Select
                        value={currentFundId}
                        onValueChange={(value) => updateSelection(row._id, "fundId", value)}
                        disabled={isProcessed}
                      >
                        <SelectTrigger
                          className={`font-primary text-sm ${
                            bulkAssignments.fund.has(row._id) ? "border-ink bg-highlight" : "border-ledger bg-paper"
                          }`}
                        >
                          <SelectValue placeholder="Select fund" />
                        </SelectTrigger>
                        <SelectContent className="font-primary">
                          {funds.map((fund) => (
                            <SelectItem key={fund._id} value={fund._id}>
                              {fund.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleRow(row._id)}
                      >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded ? (
                    <TableRow className="bg-paper">
                      <TableCell colSpan={6}>
                        <div className="space-y-4 p-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium uppercase text-grey-mid">Category</span>
                                {row.categoryConfidence !== undefined ? (
                                  <ConfidenceBadge
                                    confidence={row.categoryConfidence}
                                    source="keyword"
                                    showPercentage
                                  />
                                ) : null}
                              </div>
                              <Popover
                                open={isPopoverOpen(row._id, "category")}
                                onOpenChange={(open) => togglePopover(row._id, "category", open)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    disabled={isProcessed}
                                    className={`h-9 w-full justify-between text-sm font-normal ${
                                      bulkAssignments.category.has(row._id)
                                        ? "border-ink bg-highlight"
                                        : "border-ledger bg-paper"
                                    }`}
                                  >
                                    <span className="truncate">
                                      {(() => {
                                        const currentValue = selected[row._id]?.categoryId || row.detectedCategoryId;
                                        if (!currentValue) return "No category";
                                        const cat = categories.find((item) => item._id === currentValue);
                                        return cat ? cat.name : "No category";
                                      })()}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[320px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search categories..." className="h-9" />
                                    <CommandEmpty>No category found.</CommandEmpty>
                                    <CommandGroup className="max-h-64 overflow-auto">
                                      <CommandItem
                                        value="no-category"
                                        onSelect={() => {
                                          updateSelection(row._id, "categoryId", "");
                                          togglePopover(row._id, "category", false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            !selected[row._id]?.categoryId && !row.detectedCategoryId
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        No category
                                      </CommandItem>
                                      {categories
                                        .filter((category) => {
                                          const transactionType = row.raw.amount >= 0 ? "income" : "expense";
                                          return category.type === transactionType;
                                        })
                                        .map((category) => {
                                          const currentValue = selected[row._id]?.categoryId || row.detectedCategoryId;
                                          const isActive = currentValue === category._id;
                                          return (
                                            <CommandItem
                                              key={category._id}
                                              value={category.name}
                                              onSelect={() => {
                                                updateSelection(row._id, "categoryId", category._id);
                                                togglePopover(row._id, "category", false);
                                              }}
                                            >
                                              <Check className={`mr-2 h-4 w-4 ${isActive ? "opacity-100" : "opacity-0"}`} />
                                              {category.name}
                                            </CommandItem>
                                          );
                                        })}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium uppercase text-grey-mid">Donor</span>
                                {row.donorConfidence !== undefined ? (
                                  <ConfidenceBadge confidence={row.donorConfidence} source="keyword" showPercentage />
                                ) : null}
                              </div>
                              <Popover
                                open={isPopoverOpen(row._id, "donor")}
                                onOpenChange={(open) => togglePopover(row._id, "donor", open)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    disabled={isProcessed}
                                    className={`h-9 w-full justify-between text-sm font-normal ${
                                      bulkAssignments.donor.has(row._id)
                                        ? "border-ink bg-highlight"
                                        : "border-ledger bg-paper"
                                    }`}
                                  >
                                    <span className="truncate">
                                      {(() => {
                                        const currentValue = selected[row._id]?.donorId || row.detectedDonorId;
                                        if (!currentValue) return "No donor";
                                        const donor = donors.find((item) => item._id === currentValue);
                                        return donor ? donor.name : "No donor";
                                      })()}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[320px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search donors..." className="h-9" />
                                    <CommandEmpty>No donor found.</CommandEmpty>
                                    <CommandGroup className="max-h-64 overflow-auto">
                                      <CommandItem
                                        value="no-donor"
                                        onSelect={() => {
                                          updateSelection(row._id, "donorId", "");
                                          togglePopover(row._id, "donor", false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            !selected[row._id]?.donorId && !row.detectedDonorId
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        No donor
                                      </CommandItem>
                                      {donors.map((donor) => {
                                        const currentValue = selected[row._id]?.donorId || row.detectedDonorId;
                                        const isActive = currentValue === donor._id;
                                        return (
                                          <CommandItem
                                            key={donor._id}
                                            value={donor.name}
                                            onSelect={() => {
                                              updateSelection(row._id, "donorId", donor._id);
                                              togglePopover(row._id, "donor", false);
                                            }}
                                          >
                                            <Check className={`mr-2 h-4 w-4 ${isActive ? "opacity-100" : "opacity-0"}`} />
                                            {donor.name}
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-grey-mid">
                              Bank reference {row.raw.reference ? `· ${row.raw.reference}` : "not provided"}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-ledger text-grey-mid hover:text-ink"
                                disabled={isProcessed}
                                onClick={() => onSkipSelection([row._id as Id<"csvRows">])}
                              >
                                Skip row
                              </Button>
                              <Button
                                size="sm"
                                className="border-ledger bg-ink text-paper hover:bg-ink/90"
                                disabled={isProcessed || !currentFundId}
                                onClick={() =>
                                  onApproveSelection([
                                    {
                                      rowId: row._id as Id<"csvRows">,
                                      fundId: currentFundId as Id<"funds">,
                                      categoryId: selected[row._id]?.categoryId
                                        ? (selected[row._id]?.categoryId as Id<"categories">)
                                        : row.detectedCategoryId
                                        ? (row.detectedCategoryId as Id<"categories">)
                                        : undefined,
                                      donorId: selected[row._id]?.donorId
                                        ? (selected[row._id]?.donorId as Id<"donors">)
                                        : row.detectedDonorId
                                        ? (row.detectedDonorId as Id<"donors">)
                                        : undefined,
                                    },
                                  ])
                                }
                              >
                                Approve row
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <BulkActionsBar
        selectedCount={checkedRowsArray.length}
        selectionTotals={selectionTotals}
        onClearSelection={handleClearSelection}
        onAssignFund={() => handleBulkAssign("fund")}
        onAssignCategory={() => handleBulkAssign("category")}
        onAssignDonor={() => handleBulkAssign("donor")}
        onSkipSelected={() => onSkipSelection(checkedRowsArray as Id<"csvRows">[])}
        onApproveSelected={() => onApproveSelection(readyRows)}
        disableSkip={checkedRowsArray.length === 0}
        disableApprove={readyRows.length === 0 || funds.length === 0}
      />

      <BulkAssignmentDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        type={bulkDialogType}
        selectedRows={filteredRows.filter((row) => checkedRows.has(row._id) && row.status !== "skipped" && row.status !== "approved")}
        funds={funds}
        categories={categories}
        donors={donors}
        onConfirm={handleBulkConfirm}
      />
    </section>
  );
}

type SummaryCardProps = {
  id: string;
  label: string;
  value: string;
  sublabel: string;
  onClick?: () => void;
  tone?: "default" | "success" | "danger" | "info";
};

function SummaryCard({ label, value, sublabel, onClick, tone = "default" }: SummaryCardProps) {
  const toneClasses = {
    default: "border-ledger bg-paper hover:border-ink",
    success: "border-success/40 bg-success/5 text-success hover:border-success",
    danger: "border-error/40 bg-error/5 text-error hover:border-error",
    info: "border-highlight bg-highlight/40 text-ink hover:border-ink",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-xl border px-4 py-4 text-left transition ${toneClasses[tone]}`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-grey-mid">{label}</span>
      <span className="text-2xl font-semibold text-ink">{value}</span>
      <span className="text-xs text-grey-mid">{sublabel}</span>
    </button>
  );
}

type RowStatus = CsvRow["status"];

function RowStatusBadge({ status }: { status: RowStatus }) {
  const config: Record<RowStatus, { label: string; className: string }> = {
    pending: { label: "Pending", className: "border-ledger bg-highlight text-ink" },
    ready: { label: "Ready", className: "border-success/40 bg-success/10 text-success" },
    duplicate: { label: "Duplicate", className: "border-error/40 bg-error/10 text-error" },
    approved: { label: "Approved", className: "border-ink bg-ink text-paper" },
    skipped: { label: "Skipped", className: "border-ledger bg-paper text-grey-mid" },
  };

  const badge = config[status];

  return (
    <Badge variant="secondary" className={`text-xs ${badge.className}`}>
      {badge.label}
    </Badge>
  );
}

