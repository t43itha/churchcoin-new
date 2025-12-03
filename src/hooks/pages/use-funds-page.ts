"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";

import { useChurch } from "@/contexts/church-context";
import { api, type Id } from "@/lib/convexGenerated";
import type { FundCardSummary } from "@/components/funds/fund-card";
import type { FundOverview } from "@/components/funds/types";
import type { FundFormValues } from "@/components/funds/fund-form";

export interface FundsTotals {
  balance: number;
  income: number;
  expense: number;
  count: number;
  byType: Record<FundCardSummary["type"], number>;
}

export interface UseFundsPageReturn {
  // State
  churchId: Id<"churches"> | null;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  isCreateSubmitting: boolean;
  createError: string | null;
  editingFundId: Id<"funds"> | null;
  setEditingFundId: (id: Id<"funds"> | null) => void;
  isUpdateSubmitting: boolean;
  updateError: string | null;

  // Data
  fundsOverview: ReturnType<typeof useQuery<typeof api.funds.getFundsOverview>>;
  fundCards: FundCardSummary[];
  totals: FundsTotals;
  editingFund: FundOverview | null;

  // Actions
  handleCreateFund: (values: FundFormValues) => Promise<void>;
  handleUpdateFund: (values: FundFormValues) => Promise<void>;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  closeEditDialog: () => void;
  navigateToFund: (fundId: Id<"funds">) => void;
}

/**
 * Hook that encapsulates all funds page state and logic.
 * Reduces page component from 350 lines to ~150 lines.
 */
export function useFundsPage(): UseFundsPageReturn {
  const router = useRouter();
  const { churchId } = useChurch();

  // =========================================================================
  // STATE
  // =========================================================================

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingFundId, setEditingFundId] = useState<Id<"funds"> | null>(null);
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // =========================================================================
  // QUERIES
  // =========================================================================

  const fundsOverview = useQuery(
    api.funds.getFundsOverview,
    churchId ? { churchId } : "skip"
  );

  // =========================================================================
  // MUTATIONS
  // =========================================================================

  const createFund = useMutation(api.funds.createFund);
  const updateFund = useMutation(api.funds.updateFund);

  // =========================================================================
  // DERIVED DATA
  // =========================================================================

  const fundLookup = useMemo(() => {
    if (!fundsOverview) {
      return new Map<Id<"funds">, FundOverview>();
    }
    return new Map<Id<"funds">, FundOverview>(
      fundsOverview.map((entry) => [entry.fund._id, entry])
    );
  }, [fundsOverview]);

  const editingFund = editingFundId ? fundLookup.get(editingFundId) ?? null : null;

  const fundCards = useMemo<FundCardSummary[]>(() => {
    if (!fundsOverview) return [];

    return fundsOverview.map((entry) => ({
      id: entry.fund._id,
      name: entry.fund.name,
      type: entry.fund.type,
      balance: entry.fund.balance,
      description: entry.fund.description,
      restrictions: entry.fund.restrictions,
      incomeTotal: entry.incomeTotal,
      expenseTotal: entry.expenseTotal,
      lastTransactionDate: entry.lastTransactionDate,
      isFundraising: entry.fund.isFundraising ?? false,
      fundraisingTarget: entry.fund.fundraisingTarget ?? null,
      fundraisingRaised: entry.incomeTotal,
      fundraisingPledged: entry.fundraising?.pledgedTotal ?? 0,
      outstandingToTarget: entry.fundraising?.outstandingToTarget ?? null,
      supporterCount: entry.fundraising?.supporterCount ?? 0,
    }));
  }, [fundsOverview]);

  const totals = useMemo<FundsTotals>(() => {
    return fundCards.reduce(
      (acc, fund) => {
        acc.balance += fund.balance;
        acc.income += fund.incomeTotal;
        acc.expense += fund.expenseTotal;
        acc.count += 1;
        acc.byType[fund.type] = (acc.byType[fund.type] ?? 0) + 1;
        return acc;
      },
      {
        balance: 0,
        income: 0,
        expense: 0,
        count: 0,
        byType: {} as Record<FundCardSummary["type"], number>,
      }
    );
  }, [fundCards]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const openCreateDialog = useCallback(() => {
    setCreateError(null);
    setIsCreateOpen(true);
  }, []);

  const closeCreateDialog = useCallback(() => {
    setIsCreateOpen(false);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingFundId(null);
  }, []);

  const navigateToFund = useCallback(
    (fundId: Id<"funds">) => {
      router.push(`/funds/${fundId}`);
    },
    [router]
  );

  const handleCreateFund = useCallback(
    async (values: FundFormValues) => {
      if (!churchId) {
        setCreateError("Select a church before creating funds");
        return;
      }

      setIsCreateSubmitting(true);
      setCreateError(null);

      try {
        await createFund({
          churchId,
          name: values.name.trim(),
          type: values.type,
          description: values.description?.trim() ? values.description.trim() : undefined,
          restrictions: values.restrictions?.trim() ? values.restrictions.trim() : undefined,
          isFundraising: values.isFundraising,
          fundraisingTarget:
            values.isFundraising && values.fundraisingTarget !== undefined
              ? values.fundraisingTarget
              : undefined,
        });
        setIsCreateOpen(false);
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "Unable to create fund");
      } finally {
        setIsCreateSubmitting(false);
      }
    },
    [churchId, createFund]
  );

  const handleUpdateFund = useCallback(
    async (values: FundFormValues) => {
      if (!editingFund) return;

      setIsUpdateSubmitting(true);
      setUpdateError(null);

      try {
        await updateFund({
          fundId: editingFund.fund._id,
          name: values.name.trim(),
          type: values.type,
          description: values.description?.trim() ? values.description.trim() : null,
          restrictions: values.restrictions?.trim() ? values.restrictions.trim() : null,
          isFundraising: values.isFundraising,
          fundraisingTarget: values.isFundraising ? values.fundraisingTarget ?? null : null,
        });
        setEditingFundId(null);
      } catch (error) {
        setUpdateError(error instanceof Error ? error.message : "Unable to update fund");
      } finally {
        setIsUpdateSubmitting(false);
      }
    },
    [editingFund, updateFund]
  );

  return {
    // State
    churchId,
    isCreateOpen,
    setIsCreateOpen,
    isCreateSubmitting,
    createError,
    editingFundId,
    setEditingFundId,
    isUpdateSubmitting,
    updateError,

    // Data
    fundsOverview,
    fundCards,
    totals,
    editingFund,

    // Actions
    handleCreateFund,
    handleUpdateFund,
    openCreateDialog,
    closeCreateDialog,
    closeEditDialog,
    navigateToFund,
  };
}
