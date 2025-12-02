"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { FileDown, HandHeart, Upload, Users, UserPlus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DonorCard } from "@/components/donors/donor-card";
import { DonorFilterChips } from "@/components/donors/donor-filter-chips";
import { DonorListSkeleton } from "@/components/donors/donor-list-skeleton";
import { DonorDetailsSummary } from "@/components/donors/donor-details-summary";
import { GivingHistoryLedger } from "@/components/donors/giving-history-ledger";
import { GivingByFundCard } from "@/components/donors/giving-by-fund-card";
import { DonorFormDialog } from "@/components/donors/donor-form-dialog";
import type { Id } from "@/lib/convexGenerated";
import { api } from "@/lib/convexGenerated";
import { formatCurrency } from "@/lib/formats";
import { useDonorsPage } from "@/hooks/pages/use-donors-page";

type SortOption = "name" | "lastGift" | "totalGiving";

export default function DonorDirectoryPage() {
  const {
    // State
    churchId,
    setChurchId,
    setSelectedDonorId,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    isFormOpen,
    setIsFormOpen,
    formDonor,
    setFormDonor,
    pageNotice,
    setPageNotice,
    statementDialog,
    setStatementDialog,

    // Data
    churches,
    donors,
    selectedDonor,
    filteredDonors,
    donorMetrics,
    historyEntries,
    selectedGivingTotals,
    givingByFund,
    totalGiving,
    totalGifts,
    giftAidCount,
    statementRange,
    statementScopeLabel,

    // Actions
    handleOpenStatements,
    handleArchive,
    openCreateForm,
    openEditForm,
    clearFilters,
  } = useDonorsPage();

  const selectedChurchId = churchId ?? "";

  return (
    <div className="min-h-screen bg-paper pb-12">
      <header className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-grey-mid">
                <Users className="h-5 w-5" />
                <span className="text-sm uppercase tracking-wide">Donor management</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Donor directory</h1>
              <p className="text-sm text-grey-mid">
                Manage Gift Aid declarations, track giving history, and prepare donor statements.
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:items-end">
              <span className="text-xs uppercase tracking-wide text-grey-mid">Active church</span>
              <Select
                value={selectedChurchId}
                onValueChange={(value) =>
                  setChurchId(value ? (value as Id<"churches">) : null)
                }
              >
                <SelectTrigger className="w-[240px] font-primary">
                  <SelectValue placeholder="Select church" />
                </SelectTrigger>
                <SelectContent className="font-primary">
                  {churches?.map((church) => (
                    <SelectItem key={church._id} value={church._id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-grey-mid">
              <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
                <HandHeart className="mr-1 h-3.5 w-3.5" /> Anonymous giving supported
              </Badge>
              <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
                {totalGifts} gifts · {formatCurrency(totalGiving)} total
              </Badge>
              <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
                {giftAidCount} Gift Aid declarations
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/donors/import">
                <Button variant="outline" className="border-ledger font-primary">
                  <Upload className="mr-2 h-4 w-4" /> Import
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-ledger font-primary"
                onClick={() => handleOpenStatements(null)}
                disabled={!churchId || !donors || donors.length === 0}
              >
                <FileDown className="mr-2 h-4 w-4" /> Statements
              </Button>
              <Button
                className="border-ledger bg-ink text-paper hover:bg-ink/90"
                onClick={openCreateForm}
                disabled={!churchId}
              >
                <UserPlus className="mr-2 h-4 w-4" /> New donor
              </Button>
            </div>
          </div>
          {pageNotice ? (
            <div className="rounded-lg border border-ledger bg-highlight/50 px-4 py-3 text-sm text-ink">
              {pageNotice}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr,1.4fr]">
          <section className="space-y-4">
            <DonorFilterChips
              activeFilters={filters}
              onFilterChange={setFilters}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-grey-mid">
                Showing {filteredDonors.length} of {donors?.length ?? 0} donors
              </p>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[220px] font-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-primary text-sm">
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="lastGift">Last gift (recent first)</SelectItem>
                  <SelectItem value="totalGiving">Total giving (high to low)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!donors && <DonorListSkeleton />}
            {donors && filteredDonors.length === 0 ? (
              <EmptyState
                title="No donors found"
                description={
                  searchQuery || Object.values(filters).some(Boolean)
                    ? "Adjust your search or clear filters to see more donors."
                    : "Add your first donor to begin tracking giving."
                }
                actionLabel={searchQuery || Object.values(filters).some(Boolean) ? "Clear filters" : undefined}
                onAction={clearFilters}
              />
            ) : null}

            {filteredDonors.map((donor) => (
              <DonorCard
                key={donor._id}
                donor={donor}
                isSelected={selectedDonor?._id === donor._id}
                onSelect={() => {
                  setSelectedDonorId(donor._id);
                  setPageNotice(null);
                }}
                metrics={donorMetrics.get(donor._id)}
              />
            ))}
          </section>

          <section className="space-y-6">
            {!selectedDonor ? (
              <EmptyState
                title="Select a donor"
                description="Choose a donor from the directory to view contact details and giving history."
              />
            ) : (
              <>
                <DonorDetailsSummary
                  donor={selectedDonor}
                  givingTotals={selectedGivingTotals}
                  onEdit={() => openEditForm(selectedDonor)}
                  onArchive={() => handleArchive(selectedDonor)}
                  onGenerateStatement={() => handleOpenStatements([selectedDonor._id])}
                />
                <GivingHistoryLedger history={historyEntries} />
                <GivingByFundCard givingByFund={givingByFund} />
              </>
            )}
          </section>
        </div>
      </main>

      <DonorFormDialog
        donor={formDonor}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setFormDonor(null);
          }
        }}
        churchId={churchId}
      />

      <GenerateStatementsDialog
        open={statementDialog.open}
        onOpenChange={(open) => {
          setStatementDialog({
            open,
            donorIds: open ? statementDialog.donorIds : null,
          });
        }}
        churchId={churchId}
        donorIds={statementDialog.donorIds}
        scopeLabel={statementScopeLabel}
        defaultRange={statementRange}
        onComplete={(message) => setPageNotice(message)}
        onError={(message) => setPageNotice(message)}
      />
    </div>
  );
}

// =============================================================================
// LOCAL COMPONENTS
// =============================================================================

type GenerateStatementsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchId: Id<"churches"> | null;
  donorIds: Id<"donors">[] | null;
  scopeLabel: string;
  defaultRange: { fromDate: string; toDate: string };
  onComplete: (message: string) => void;
  onError: (message: string) => void;
};

type RangePreset = "thisYear" | "lastYear" | "custom";

const formatDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

function GenerateStatementsDialog({
  open,
  onOpenChange,
  churchId,
  donorIds,
  scopeLabel,
  defaultRange,
  onComplete,
  onError,
}: GenerateStatementsDialogProps) {
  const { fromDate: defaultFromDate, toDate: defaultToDate } = defaultRange;
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [fundType, setFundType] = useState<"general" | "restricted">("restricted");
  const [rangePreset, setRangePreset] = useState<RangePreset>("thisYear");
  const [isGenerating, setIsGenerating] = useState(false);

  const eligible = useQuery(
    api.reports.getDonorStatementCount,
    open && churchId
      ? {
          churchId,
          fromDate,
          toDate,
          fundType,
          donorIds: donorIds && donorIds.length > 0 ? donorIds : undefined,
        }
      : "skip",
  );
  const eligibleCount = eligible?.count ?? 0;

  const presetToRange = useCallback((preset: RangePreset) => {
    const currentYear = new Date().getFullYear();
    if (preset === "thisYear") {
      return {
        from: formatDateString(currentYear, 1, 1),
        to: formatDateString(currentYear, 12, 31),
      };
    }
    if (preset === "lastYear") {
      const lastYear = currentYear - 1;
      return {
        from: formatDateString(lastYear, 1, 1),
        to: formatDateString(lastYear, 12, 31),
      };
    }
    return {
      from: defaultFromDate,
      to: defaultToDate,
    };
  }, [defaultFromDate, defaultToDate]);

  useEffect(() => {
    if (open) {
      setRangePreset("thisYear");
      const { from, to } = presetToRange("thisYear");
      setFromDate(from);
      setToDate(to);
      setFundType("restricted");
    }
  }, [open, presetToRange]);

  const handlePresetChange = (value: RangePreset) => {
    setRangePreset(value);
    if (value === "custom") {
      return;
    }
    const { from, to } = presetToRange(value);
    setFromDate(from);
    setToDate(to);
  };

  const handleGenerate = async () => {
    if (!churchId) {
      onError("Select a church before generating statements.");
      return;
    }

    if (!fromDate || !toDate) {
      onError("Please choose both start and end dates.");
      return;
    }

    if (eligibleCount === 0) {
      onError("No eligible transactions for the selected period and scope.");
      return;
    }

    setIsGenerating(true);

    try {
      const payload: Record<string, unknown> = {
        churchId,
        fromDate,
        toDate,
        fundType,
      };

      if (donorIds && donorIds.length > 0) {
        payload.donorIds = donorIds;
      }

      const response = await fetch("/api/reports/donor-statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate statements.";
        try {
          const data = await response.json();
          if (data?.error) {
            errorMessage = data.error as string;
          }
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Received an empty document.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const statementSlug = fundType === "restricted" ? "building-fund" : "tithe";
      const scopeSlug = donorIds?.length
        ? donorIds.length === 1
          ? "donor"
          : "selection"
        : "all";
      link.href = url;
      link.download = `${statementSlug}-statements-${fromDate}-${toDate}-${scopeSlug}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      const typeLabel = fundType === "restricted" ? "Building Fund" : "Tithe";
      onComplete(`${typeLabel} statements prepared for ${scopeLabel}.`);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate statements.";
      onError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-primary sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate donor statements</DialogTitle>
          <DialogDescription>
            Download a PDF for {scopeLabel} using the selected schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Period</Label>
            <Select value={rangePreset} onValueChange={(value) => handlePresetChange(value as RangePreset)}>
              <SelectTrigger className="font-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-primary text-sm">
                <SelectItem value="thisYear">This year</SelectItem>
                <SelectItem value="lastYear">Last year</SelectItem>
                <SelectItem value="custom">Custom period</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="statement-from">From date</Label>
            <Input
              id="statement-from"
              type="date"
              value={fromDate}
              disabled={rangePreset !== "custom"}
              max={toDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="statement-to">To date</Label>
            <Input
              id="statement-to"
              type="date"
              value={toDate}
              disabled={rangePreset !== "custom"}
              min={fromDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Statement type</Label>
            <Select value={fundType} onValueChange={(value) => setFundType(value as "general" | "restricted") }>
              <SelectTrigger className="font-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-primary text-sm">
                <SelectItem value="general">Tithe schedule</SelectItem>
                <SelectItem value="restricted">Building Fund schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-grey-mid">
            Building Fund statements reuse the dedicated PDF design already configured for legacy projects.
          </p>
          <p className="text-xs text-grey-mid">
            {eligible
              ? eligibleCount > 0
                ? `${eligibleCount} statement${eligibleCount === 1 ? "" : "s"} will be generated.`
                : "No eligible transactions in this period/scope."
              : null}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-ledger" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            className="border-ledger bg-ink text-paper hover:bg-ink/90"
            onClick={handleGenerate}
            disabled={isGenerating || !churchId || eligibleCount === 0}
          >
            {isGenerating ? "Preparing…" : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-ledger bg-paper px-6 py-12 text-center text-sm text-grey-mid">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-grey-mid">{description}</p>
      {actionLabel && onAction ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-ledger font-primary"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
