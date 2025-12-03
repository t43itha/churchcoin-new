"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { FileDown, HandHeart, Upload, Users, UserPlus } from "lucide-react";
import Link from "next/link";

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

  return (
    <div className="min-h-screen bg-paper pb-12">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-ink">Donor directory</h1>
              <p className="text-sm text-grey-mid leading-relaxed">
                Manage Gift Aid declarations, track giving history, and prepare donor statements.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="swiss-badge bg-sage-light text-sage-dark border border-sage">
                <HandHeart className="mr-1 h-3.5 w-3.5" /> Anonymous giving supported
              </span>
              <span className="swiss-badge bg-ink text-white">
                {totalGifts} gifts · {formatCurrency(totalGiving)} total
              </span>
              <span className="swiss-badge bg-amber-light text-amber-dark border border-amber">
                {giftAidCount} Gift Aid declarations
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/donors/import">
                <Button variant="outline" className="border-ink text-ink hover:bg-ink hover:text-white transition-colors font-medium">
                  <Upload className="mr-2 h-4 w-4" /> Import
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-ink text-ink hover:bg-ink hover:text-white transition-colors font-medium"
                onClick={() => handleOpenStatements(null)}
                disabled={!churchId || !donors || donors.length === 0}
              >
                <FileDown className="mr-2 h-4 w-4" /> Statements
              </Button>
              <Button
                className="bg-ink text-white hover:bg-ink/90 font-medium shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_#d4a574] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                onClick={openCreateForm}
                disabled={!churchId}
              >
                <UserPlus className="mr-2 h-4 w-4" /> New donor
              </Button>
            </div>
          </div>
          {pageNotice ? (
            <div className="swiss-card rounded-lg border border-sage bg-sage-light/50 px-4 py-3 text-sm text-ink">
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
      <DialogContent className="sm:max-w-lg border-2 border-ink bg-white shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">Generate donor statements</DialogTitle>
          <DialogDescription className="text-grey-mid">
            Download a PDF for {scopeLabel} using the selected schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid">Period</Label>
            <Select value={rangePreset} onValueChange={(value) => handlePresetChange(value as RangePreset)}>
              <SelectTrigger className="border-ink">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisYear">This year</SelectItem>
                <SelectItem value="lastYear">Last year</SelectItem>
                <SelectItem value="custom">Custom period</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="statement-from" className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid">From date</Label>
            <Input
              id="statement-from"
              type="date"
              value={fromDate}
              disabled={rangePreset !== "custom"}
              max={toDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="border-ink"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="statement-to" className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid">To date</Label>
            <Input
              id="statement-to"
              type="date"
              value={toDate}
              disabled={rangePreset !== "custom"}
              min={fromDate}
              onChange={(event) => setToDate(event.target.value)}
              className="border-ink"
            />
          </div>
          <div className="grid gap-2">
            <Label className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid">Statement type</Label>
            <Select value={fundType} onValueChange={(value) => setFundType(value as "general" | "restricted") }>
              <SelectTrigger className="border-ink">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Tithe schedule</SelectItem>
                <SelectItem value="restricted">Building Fund schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-grey-mid">
            Building Fund statements reuse the dedicated PDF design already configured for legacy projects.
          </p>
          <div className={`swiss-badge inline-flex text-xs ${eligibleCount > 0 ? "bg-sage-light text-sage-dark border border-sage" : "bg-amber-light text-amber-dark border border-amber"}`}>
            {eligible
              ? eligibleCount > 0
                ? `${eligibleCount} statement${eligibleCount === 1 ? "" : "s"} will be generated`
                : "No eligible transactions in this period/scope"
              : "Checking eligibility..."}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-ink text-ink hover:bg-ink hover:text-white transition-colors"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            className="bg-ink text-white hover:bg-ink/90 font-medium shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_#d4a574] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
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
    <div className="swiss-card flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-ink/20 bg-white px-6 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-ink/5 flex items-center justify-center mb-4">
        <Users className="h-6 w-6 text-grey-mid" />
      </div>
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-grey-mid leading-relaxed">{description}</p>
      {actionLabel && onAction ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-ink text-ink hover:bg-ink hover:text-white transition-colors font-medium"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
