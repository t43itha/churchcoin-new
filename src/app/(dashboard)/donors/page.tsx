"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { HandHeart, Upload, Users, UserPlus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DonorCard, type DonorMetrics } from "@/components/donors/donor-card";
import {
  DonorFilterChips,
  type FilterState,
} from "@/components/donors/donor-filter-chips";
import { DonorListSkeleton } from "@/components/donors/donor-list-skeleton";
import { DonorDetailsSummary } from "@/components/donors/donor-details-summary";
import { GivingHistoryLedger } from "@/components/donors/giving-history-ledger";
import { GivingByFundCard } from "@/components/donors/giving-by-fund-card";
import { DonorFormDialog } from "@/components/donors/donor-form-dialog";
import type { Doc, Id } from "@/lib/convexGenerated";
import { api } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const now = new Date();
const statementRange = {
  fromDate: `${now.getFullYear() - 5}-01-01`,
  toDate: new Date().toISOString().slice(0, 10),
};

type SortOption = "name" | "lastGift" | "totalGiving";

export default function DonorDirectoryPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [selectedDonorId, setSelectedDonorId] = useState<Id<"donors"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDonor, setFormDonor] = useState<Doc<"donors"> | null>(null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  const donors = useQuery(
    api.donors.getDonors,
    churchId ? { churchId } : "skip",
  );

  const donorStatements = useQuery(
    api.reports.getDonorStatementBatch,
    churchId
      ? {
          churchId,
          fromDate: statementRange.fromDate,
          toDate: statementRange.toDate,
          fundType: "all",
        }
      : "skip",
  );

  const funds = useQuery(
    api.funds.getFunds,
    churchId ? { churchId } : "skip",
  );

  const selectedDonor = useMemo(() => {
    if (!donors || !selectedDonorId) {
      return null;
    }
    return donors.find((donor) => donor._id === selectedDonorId) ?? null;
  }, [donors, selectedDonorId]);

  const donorMetrics = useMemo(() => {
    const map = new Map<Id<"donors">, DonorMetrics & { lastGiftDate: string | null }>();
    if (!donorStatements) {
      return map;
    }
    donorStatements.forEach((statement) => {
      const transactions = [...statement.transactions].sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      map.set(statement.donor._id, {
        totalGiving: statement.total ?? 0,
        transactionCount: statement.transactions.length,
        lastGiftDate: transactions[0]?.date ?? null,
      });
    });
    return map;
  }, [donorStatements]);

  useEffect(() => {
    if (!selectedDonorId || !donors) {
      return;
    }
    const stillExists = donors.some((donor) => donor._id === selectedDonorId);
    if (!stillExists) {
      setSelectedDonorId(null);
    }
  }, [donors, selectedDonorId]);

  const filteredDonors = useMemo(() => {
    if (!donors) {
      return [] as Doc<"donors">[];
    }

    let list = [...donors];

    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      list = list.filter((donor) => {
        return (
          donor.name.toLowerCase().includes(search) ||
          donor.email?.toLowerCase().includes(search) ||
          donor.bankReference?.toLowerCase().includes(search)
        );
      });
    }

    if (filters.hasGiftAid) {
      list = list.filter((donor) => donor.giftAidDeclaration?.signed);
    }

    if (filters.hasEmail) {
      list = list.filter((donor) => Boolean(donor.email));
    }

    if (filters.hasPhone) {
      list = list.filter((donor) => Boolean(donor.phone));
    }

    if (filters.isActive) {
      list = list.filter((donor) => donor.isActive !== false);
    }

    if (filters.lastGiftPeriod) {
      const days = periodToDays(filters.lastGiftPeriod);
      const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter((donor) => {
        const metrics = donorMetrics.get(donor._id);
        if (!metrics?.lastGiftDate) {
          return false;
        }
        return new Date(metrics.lastGiftDate).getTime() >= threshold;
      });
    }

    switch (sortBy) {
      case "lastGift":
        list.sort((a, b) => {
          const aDate = donorMetrics.get(a._id)?.lastGiftDate;
          const bDate = donorMetrics.get(b._id)?.lastGiftDate;
          const aTime = aDate ? new Date(aDate).getTime() : 0;
          const bTime = bDate ? new Date(bDate).getTime() : 0;
          if (aTime === bTime) {
            return a.name.localeCompare(b.name);
          }
          return bTime - aTime;
        });
        break;
      case "totalGiving":
        list.sort((a, b) => {
          const aTotal = donorMetrics.get(a._id)?.totalGiving ?? 0;
          const bTotal = donorMetrics.get(b._id)?.totalGiving ?? 0;
          if (aTotal === bTotal) {
            return a.name.localeCompare(b.name);
          }
          return bTotal - aTotal;
        });
        break;
      case "name":
      default:
        list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [donors, searchQuery, filters, sortBy, donorMetrics]);

  const selectedDonorHistory = useQuery(
    api.donors.getDonorGivingHistory,
    selectedDonor ? { donorId: selectedDonor._id } : "skip",
  );

  const selectedDonorGivingByFund = useQuery(
    api.donors.getDonorGivingByFund,
    selectedDonor ? { donorId: selectedDonor._id } : "skip",
  );

  const archiveDonor = useMutation(api.donors.archiveDonor);

  const fundLookup = useMemo(() => {
    if (!funds) {
      return new Map<Id<"funds">, string>();
    }
    return new Map(funds.map((fund) => [fund._id, fund.name] as const));
  }, [funds]);

  const historyEntries = useMemo(() => {
    if (!selectedDonorHistory) {
      return [] as Array<{
        date: string;
        fundName: string | null;
        amount: number;
        giftAidEligible: boolean;
        transactionId: Id<"transactions">;
      }>;
    }

    return [...selectedDonorHistory.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((txn) => ({
        date: txn.date,
        fundName: txn.fundId ? fundLookup.get(txn.fundId) ?? null : null,
        amount: txn.amount,
        giftAidEligible: Boolean(txn.giftAid),
        transactionId: txn._id,
      }));
  }, [selectedDonorHistory, fundLookup]);

  const selectedGivingTotals = useMemo(() => {
    if (!selectedDonorHistory) {
      return {
        totalGiving: 0,
        transactionCount: 0,
        giftAidEligible: 0,
        lastGiftDate: null as string | null,
      };
    }
    const metrics = selectedDonor ? donorMetrics.get(selectedDonor._id) : undefined;
    const lastGiftDate = metrics?.lastGiftDate ?? selectedDonorHistory.transactions[0]?.date ?? null;
    return {
      totalGiving: selectedDonorHistory.totals.totalGiving ?? 0,
      transactionCount: selectedDonorHistory.totals.transactionCount ?? 0,
      giftAidEligible: selectedDonorHistory.totals.giftAidEligible ?? 0,
      lastGiftDate,
    };
  }, [selectedDonorHistory, donorMetrics, selectedDonor]);

  const givingByFund = useMemo(() => {
    if (!selectedDonorGivingByFund) {
      return [] as Array<{ fundName: string; amount: number; count: number }>;
    }
    return [...selectedDonorGivingByFund].sort((a, b) => b.amount - a.amount);
  }, [selectedDonorGivingByFund]);

  const totalGiving = donorStatements?.reduce((sum, statement) => sum + (statement.total ?? 0), 0) ?? 0;
  const totalGifts = donorStatements?.reduce((sum, statement) => sum + statement.transactions.length, 0) ?? 0;
  const giftAidCount = donors?.filter((donor) => donor.giftAidDeclaration?.signed).length ?? 0;

  const handleArchive = async (donorToArchive: Doc<"donors">) => {
    const confirmed = window.confirm(`Archive ${donorToArchive.name}?`);
    if (!confirmed) return;
    await archiveDonor({ donorId: donorToArchive._id });
    setSelectedDonorId(null);
    setPageNotice(`${donorToArchive.name} archived.`);
  };

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
                {totalGifts} gifts · {currency.format(totalGiving)} total
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
                className="border-ledger bg-ink text-paper hover:bg-ink/90"
                onClick={() => {
                  setFormDonor(null);
                  setIsFormOpen(true);
                }}
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
                onAction={() => {
                  setSearchQuery("");
                  setFilters({});
                }}
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
                  onEdit={() => {
                    setFormDonor(selectedDonor);
                    setIsFormOpen(true);
                  }}
                  onArchive={() => handleArchive(selectedDonor)}
                  onGenerateStatement={() =>
                    setPageNotice(
                      `Statement generation for ${selectedDonor.name} will be available in a future update.`,
                    )
                  }
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
    </div>
  );
}

function periodToDays(period: NonNullable<FilterState["lastGiftPeriod"]>) {
  switch (period) {
    case "week":
      return 7;
    case "month":
      return 30;
    case "quarter":
      return 90;
    case "year":
      return 365;
    default:
      return 365;
  }
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
