"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { useChurch } from "@/contexts/church-context";
import { api, type Doc, type Id } from "@/lib/convexGenerated";
import type { DonorMetrics } from "@/components/donors/donor-card";
import type { FilterState } from "@/components/donors/donor-filter-chips";

type SortOption = "name" | "lastGift" | "totalGiving";

// Statement date range - last 5 years to today
const now = new Date();
const statementRange = {
  fromDate: `${now.getFullYear() - 5}-01-01`,
  toDate: new Date().toISOString().slice(0, 10),
};

export interface UseDonorsPageReturn {
  // State
  churchId: Id<"churches"> | null;
  selectedDonorId: Id<"donors"> | null;
  setSelectedDonorId: (id: Id<"donors"> | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  formDonor: Doc<"donors"> | null;
  setFormDonor: (donor: Doc<"donors"> | null) => void;
  pageNotice: string | null;
  setPageNotice: (notice: string | null) => void;
  statementDialog: { open: boolean; donorIds: Id<"donors">[] | null };
  setStatementDialog: (state: { open: boolean; donorIds: Id<"donors">[] | null }) => void;

  // Data
  donors: Doc<"donors">[] | undefined;
  funds: ReturnType<typeof useQuery<typeof api.funds.getFunds>>;
  selectedDonor: Doc<"donors"> | null;
  filteredDonors: Doc<"donors">[];
  donorMetrics: Map<Id<"donors">, DonorMetrics & { lastGiftDate: string | null }>;
  selectedDonorHistory: ReturnType<typeof useQuery<typeof api.donors.getDonorGivingHistory>>;
  selectedDonorGivingByFund: ReturnType<typeof useQuery<typeof api.donors.getDonorGivingByFund>>;
  historyEntries: Array<{
    date: string;
    fundName: string | null;
    amount: number;
    giftAidEligible: boolean;
    transactionId: Id<"transactions">;
  }>;
  selectedGivingTotals: {
    totalGiving: number;
    transactionCount: number;
    giftAidEligible: number;
    lastGiftDate: string | null;
  };
  givingByFund: Array<{ fundName: string; amount: number; count: number }>;
  totalGiving: number;
  totalGifts: number;
  giftAidCount: number;
  statementRange: { fromDate: string; toDate: string };
  statementScopeLabel: string;

  // Actions
  handleOpenStatements: (ids: Id<"donors">[] | null) => void;
  handleArchive: (donor: Doc<"donors">) => Promise<void>;
  openCreateForm: () => void;
  openEditForm: (donor: Doc<"donors">) => void;
  clearFilters: () => void;
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

/**
 * Hook that encapsulates all donors page state and logic.
 * Reduces page component complexity significantly.
 */
export function useDonorsPage(): UseDonorsPageReturn {
  const { churchId } = useChurch();

  // =========================================================================
  // STATE
  // =========================================================================

  const [selectedDonorId, setSelectedDonorId] = useState<Id<"donors"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDonor, setFormDonor] = useState<Doc<"donors"> | null>(null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [statementDialog, setStatementDialog] = useState<{
    open: boolean;
    donorIds: Id<"donors">[] | null;
  }>({ open: false, donorIds: null });

  // =========================================================================
  // QUERIES
  // =========================================================================

  const donors = useQuery(api.donors.getDonors, churchId ? { churchId } : "skip");
  const funds = useQuery(api.funds.getFunds, churchId ? { churchId } : "skip");

  const donorStatements = useQuery(
    api.reports.getDonorStatementBatch,
    churchId
      ? {
          churchId,
          fromDate: statementRange.fromDate,
          toDate: statementRange.toDate,
          fundType: "all",
        }
      : "skip"
  );

  const selectedDonor = useMemo(() => {
    if (!donors || !selectedDonorId) return null;
    return donors.find((donor) => donor._id === selectedDonorId) ?? null;
  }, [donors, selectedDonorId]);

  const selectedDonorHistory = useQuery(
    api.donors.getDonorGivingHistory,
    selectedDonor ? { donorId: selectedDonor._id } : "skip"
  );

  const selectedDonorGivingByFund = useQuery(
    api.donors.getDonorGivingByFund,
    selectedDonor ? { donorId: selectedDonor._id } : "skip"
  );

  // =========================================================================
  // MUTATIONS
  // =========================================================================

  const archiveDonor = useMutation(api.donors.archiveDonor);

  // =========================================================================
  // EFFECTS
  // =========================================================================

  // Clear selected donor if it no longer exists
  useEffect(() => {
    if (!selectedDonorId || !donors) return;
    const stillExists = donors.some((donor) => donor._id === selectedDonorId);
    if (!stillExists) {
      setSelectedDonorId(null);
    }
  }, [donors, selectedDonorId]);

  // =========================================================================
  // DERIVED DATA
  // =========================================================================

  const donorMetrics = useMemo(() => {
    const map = new Map<Id<"donors">, DonorMetrics & { lastGiftDate: string | null }>();
    if (!donorStatements) return map;

    donorStatements.forEach((statement) => {
      const transactions = [...statement.transactions].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      map.set(statement.donor._id, {
        totalGiving: statement.total ?? 0,
        transactionCount: statement.transactions.length,
        lastGiftDate: transactions[0]?.date ?? null,
      });
    });
    return map;
  }, [donorStatements]);

  const filteredDonors = useMemo(() => {
    if (!donors) return [] as Doc<"donors">[];

    let list = [...donors];

    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      list = list.filter(
        (donor) =>
          donor.name.toLowerCase().includes(search) ||
          donor.email?.toLowerCase().includes(search) ||
          donor.bankReference?.toLowerCase().includes(search)
      );
    }

    // Attribute filters
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

    // Last gift period filter
    if (filters.lastGiftPeriod) {
      const days = periodToDays(filters.lastGiftPeriod);
      const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter((donor) => {
        const metrics = donorMetrics.get(donor._id);
        if (!metrics?.lastGiftDate) return false;
        return new Date(metrics.lastGiftDate).getTime() >= threshold;
      });
    }

    // Sorting
    switch (sortBy) {
      case "lastGift":
        list.sort((a, b) => {
          const aDate = donorMetrics.get(a._id)?.lastGiftDate;
          const bDate = donorMetrics.get(b._id)?.lastGiftDate;
          const aTime = aDate ? new Date(aDate).getTime() : 0;
          const bTime = bDate ? new Date(bDate).getTime() : 0;
          if (aTime === bTime) return a.name.localeCompare(b.name);
          return bTime - aTime;
        });
        break;
      case "totalGiving":
        list.sort((a, b) => {
          const aTotal = donorMetrics.get(a._id)?.totalGiving ?? 0;
          const bTotal = donorMetrics.get(b._id)?.totalGiving ?? 0;
          if (aTotal === bTotal) return a.name.localeCompare(b.name);
          return bTotal - aTotal;
        });
        break;
      case "name":
      default:
        list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [donors, searchQuery, filters, sortBy, donorMetrics]);

  const fundLookup = useMemo(() => {
    if (!funds) return new Map<Id<"funds">, string>();
    return new Map(funds.map((fund) => [fund._id, fund.name] as const));
  }, [funds]);

  const historyEntries = useMemo(() => {
    if (!selectedDonorHistory) return [];

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
    const lastGiftDate =
      metrics?.lastGiftDate ?? selectedDonorHistory.transactions[0]?.date ?? null;
    return {
      totalGiving: selectedDonorHistory.totals.totalGiving ?? 0,
      transactionCount: selectedDonorHistory.totals.transactionCount ?? 0,
      giftAidEligible: selectedDonorHistory.totals.giftAidEligible ?? 0,
      lastGiftDate,
    };
  }, [selectedDonorHistory, donorMetrics, selectedDonor]);

  const givingByFund = useMemo(() => {
    if (!selectedDonorGivingByFund) return [];
    return [...selectedDonorGivingByFund].sort((a, b) => b.amount - a.amount);
  }, [selectedDonorGivingByFund]);

  const totalGiving =
    donorStatements?.reduce((sum, statement) => sum + (statement.total ?? 0), 0) ?? 0;
  const totalGifts =
    donorStatements?.reduce((sum, statement) => sum + statement.transactions.length, 0) ?? 0;
  const giftAidCount =
    donors?.filter((donor) => donor.giftAidDeclaration?.signed).length ?? 0;

  const statementScopeLabel = useMemo(() => {
    if (!statementDialog.donorIds) return "All donors";
    if (statementDialog.donorIds.length === 1) {
      const donorName = donors?.find(
        (donor) => donor._id === statementDialog.donorIds?.[0]
      )?.name;
      return donorName ? `Donor: ${donorName}` : "Selected donor";
    }
    return `${statementDialog.donorIds.length} donors`;
  }, [statementDialog.donorIds, donors]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleOpenStatements = useCallback((ids: Id<"donors">[] | null) => {
    setStatementDialog({ open: true, donorIds: ids });
    setPageNotice(null);
  }, []);

  const handleArchive = useCallback(
    async (donorToArchive: Doc<"donors">) => {
      const confirmed = window.confirm(`Archive ${donorToArchive.name}?`);
      if (!confirmed) return;
      await archiveDonor({ donorId: donorToArchive._id });
      setSelectedDonorId(null);
      setPageNotice(`${donorToArchive.name} archived.`);
    },
    [archiveDonor]
  );

  const openCreateForm = useCallback(() => {
    setFormDonor(null);
    setIsFormOpen(true);
  }, []);

  const openEditForm = useCallback((donor: Doc<"donors">) => {
    setFormDonor(donor);
    setIsFormOpen(true);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilters({});
  }, []);

  return {
    // State
    churchId,
    selectedDonorId,
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
    funds,
    selectedDonor,
    filteredDonors,
    donorMetrics,
    selectedDonorHistory,
    selectedDonorGivingByFund,
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
  };
}
