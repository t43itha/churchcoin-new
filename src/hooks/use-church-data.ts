"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convexGenerated";
import type { Id } from "@/lib/convexGenerated";

/**
 * Custom hook for accessing church-scoped fund data.
 * Centralizes church context and common fund patterns.
 */
export function useChurchFunds(churchId: Id<"churches"> | undefined) {
  const funds = useQuery(
    api.funds.getFunds,
    churchId ? { churchId } : "skip"
  );

  const createFund = useMutation(api.funds.createFund);
  const updateFund = useMutation(api.funds.updateFund);
  const archiveFund = useMutation(api.funds.archiveFund);

  return {
    funds,
    isLoading: funds === undefined,
    isEmpty: funds?.length === 0,
    createFund,
    updateFund,
    archiveFund,
  };
}

/**
 * Hook for transaction operations within a church.
 */
export function useChurchTransactions(
  churchId: Id<"churches"> | undefined,
  fundId?: Id<"funds">
) {
  const result = useQuery(
    api.transactions.getTransactions,
    churchId ? { churchId, fundId } : "skip"
  );

  const createTransaction = useMutation(api.transactions.createTransaction);
  const updateTransaction = useMutation(api.transactions.updateTransaction);
  const deleteTransaction = useMutation(api.transactions.deleteTransaction);

  return {
    transactions: result?.page,
    paginationResult: result,
    isLoading: result === undefined,
    isEmpty: result?.page?.length === 0,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

/**
 * Hook for donor management.
 */
export function useChurchDonors(churchId: Id<"churches"> | undefined) {
  const donors = useQuery(
    api.donors.getDonors,
    churchId ? { churchId } : "skip"
  );

  const createDonor = useMutation(api.donors.createDonor);
  const updateDonor = useMutation(api.donors.updateDonor);

  return {
    donors,
    isLoading: donors === undefined,
    isEmpty: donors?.length === 0,
    createDonor,
    updateDonor,
  };
}

/**
 * Hook for category management.
 */
export function useChurchCategories(churchId: Id<"churches"> | undefined) {
  const categories = useQuery(
    api.categories.getCategories,
    churchId ? { churchId } : "skip"
  );

  return {
    categories,
    isLoading: categories === undefined,
    isEmpty: categories?.length === 0,
    incomeCategories: categories?.filter((c) => c.type === "income") ?? [],
    expenseCategories: categories?.filter((c) => c.type === "expense") ?? [],
  };
}

/**
 * Hook for fund overview data (includes transactions and fundraising).
 */
export function useFundOverview(churchId: Id<"churches"> | undefined) {
  const overview = useQuery(
    api.funds.getFundsOverview,
    churchId ? { churchId } : "skip"
  );

  return {
    overview,
    isLoading: overview === undefined,
    isEmpty: overview?.length === 0,
  };
}

/**
 * Hook for a single fund's data.
 */
export function useFund(fundId: Id<"funds"> | undefined) {
  const fund = useQuery(
    api.funds.getFund,
    fundId ? { fundId } : "skip"
  );

  const updateFund = useMutation(api.funds.updateFund);

  return {
    fund,
    isLoading: fund === undefined,
    notFound: fund === null,
    updateFund,
  };
}

/**
 * Hook for a single donor's data.
 */
export function useDonor(donorId: Id<"donors"> | undefined) {
  const donor = useQuery(
    api.donors.getDonor,
    donorId ? { donorId } : "skip"
  );

  const updateDonor = useMutation(api.donors.updateDonor);

  return {
    donor,
    isLoading: donor === undefined,
    notFound: donor === null,
    updateDonor,
  };
}

/**
 * Hook for financial periods.
 */
export function useFinancialPeriods(churchId: Id<"churches"> | undefined) {
  const periods = useQuery(
    api.financialPeriods.listPeriods,
    churchId ? { churchId } : "skip"
  );

  return {
    periods,
    isLoading: periods === undefined,
    isEmpty: periods?.length === 0,
    currentPeriod: periods?.[0],
  };
}

/**
 * Hook for AI insights.
 */
export function useAiInsights(churchId: Id<"churches"> | undefined) {
  const insights = useQuery(
    api.aiInsights.listActiveInsights,
    churchId ? { churchId } : "skip"
  );

  const dismissInsight = useMutation(api.aiInsights.dismissInsight);
  const markAsRead = useMutation(api.aiInsights.markInsightRead);

  return {
    insights,
    isLoading: insights === undefined,
    isEmpty: insights?.length === 0,
    unreadCount: insights?.filter((i) => !i.isRead).length ?? 0,
    dismissInsight,
    markAsRead,
  };
}
