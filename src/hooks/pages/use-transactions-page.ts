"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";

import { useChurch } from "@/contexts/church-context";
import { api, type Doc, type Id } from "@/lib/convexGenerated";
import { useSession } from "@/components/auth/session-provider";
import { getRolePermissions } from "@/lib/rbac";
import { getLastNMonths, getCurrentPeriod, periodToKey } from "@/lib/periods";
import type { PeriodViewMode } from "@/components/transactions/period-selector";
import type { TransactionCreateValues } from "@/components/transactions/bulk-transaction-dialog";

type TransactionFilter = "all" | "income" | "expense" | "reconciled" | "unreconciled";
type FeedbackState = { type: "success" | "error"; message: string } | null;

export interface UseTransactionsPageReturn {
  // State
  churchId: Id<"churches"> | null;
  viewMode: PeriodViewMode;
  setViewMode: (mode: PeriodViewMode) => void;
  expandedPeriods: Set<string>;
  feedback: FeedbackState;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  editingTransaction: Doc<"transactions"> | null;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  transactionFilter: TransactionFilter;
  setTransactionFilter: (filter: TransactionFilter) => void;

  // Data
  funds: Doc<"funds">[] | undefined;
  categories: Doc<"categories">[] | undefined;
  donors: Doc<"donors">[] | undefined;
  periods: { year: number; month: number }[] | null;
  multiPeriodSummary: ReturnType<typeof useQuery<typeof api.transactions.getMultiPeriodSummary>>;
  trendData: ReturnType<typeof useQuery<typeof api.transactions.getPeriodTrends>>;
  filteredAllTransactions: ReturnType<typeof useQuery<typeof api.transactions.getLedger>>;
  allTransactionsTotals: { income: number; expense: number };

  // Permissions
  canManageTransactions: boolean;
  canRecordManualTransactions: boolean;
  canViewFinancialData: boolean;
  showLedger: boolean;

  // Actions
  togglePeriod: (year: number, month: number) => void;
  handleCreateTransactions: (transactions: TransactionCreateValues[]) => Promise<void>;
  handleUpdateTransaction: (
    transactionId: Id<"transactions">,
    updates: TransactionUpdateValues
  ) => Promise<void>;
  handleQuickUpdateTransaction: (updates: TransactionUpdateValues) => Promise<void>;
  handleDelete: (transactionId: Id<"transactions">) => Promise<void>;
  handleToggleReconciled: (transactionId: Id<"transactions">, reconciled: boolean) => Promise<void>;
  handleRequestReceipt: (transaction: Doc<"transactions">) => Promise<void>;
  handleSuggestCategory: (transaction: Doc<"transactions">) => Promise<void>;
  openEditDialog: (transaction: Doc<"transactions">) => void;
}

interface TransactionUpdateValues {
  date?: string;
  description?: string;
  amount?: number;
  type?: "income" | "expense";
  fundId?: Id<"funds">;
  categoryId?: Id<"categories">;
  donorId?: Id<"donors">;
  method?: string;
  reference?: string;
  giftAid?: boolean;
  notes?: string;
}

/**
 * Hook that encapsulates all transactions page state and logic.
 * Reduces page component from 625 lines to ~200 lines.
 */
export function useTransactionsPage(): UseTransactionsPageReturn {
  const convex = useConvex();
  const { user } = useSession();
  const { churchId } = useChurch();

  // =========================================================================
  // STATE
  // =========================================================================

  const [viewMode, setViewMode] = useState<PeriodViewMode>("last-6");
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Doc<"transactions"> | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("all");

  // =========================================================================
  // PERMISSIONS
  // =========================================================================

  const permissions = useMemo(() => getRolePermissions(user?.role), [user?.role]);
  const canManageTransactions = permissions.canManageFinancialData;
  const canRecordManualTransactions = permissions.canRecordManualTransactions;
  const canViewFinancialData = permissions.canViewFinancialData;
  const showLedger = canViewFinancialData && !permissions.restrictedToManualEntry;

  // =========================================================================
  // PERIODS
  // =========================================================================

  const periods = useMemo(() => {
    switch (viewMode) {
      case "current":
        return [getCurrentPeriod()];
      case "last-3":
        return getLastNMonths(3);
      case "last-6":
        return getLastNMonths(6);
      case "all":
        return null;
      default:
        return getLastNMonths(6);
    }
  }, [viewMode]);

  // =========================================================================
  // QUERIES
  // =========================================================================

  const funds = useQuery(api.funds.getFunds, churchId ? { churchId } : "skip");
  const categories = useQuery(api.categories.getCategories, churchId ? { churchId } : "skip");
  const donors = useQuery(api.donors.getDonors, churchId ? { churchId } : "skip");

  const multiPeriodSummary = useQuery(
    api.transactions.getMultiPeriodSummary,
    churchId && periods ? { churchId, periods } : "skip"
  );

  const trendData = useQuery(
    api.transactions.getPeriodTrends,
    churchId && periods && periods.length > 1 ? { churchId, periods } : "skip"
  );

  const allTransactions = useQuery(
    api.transactions.getLedger,
    churchId && viewMode === "all" ? { churchId, limit: 1000 } : "skip"
  );

  // =========================================================================
  // MUTATIONS
  // =========================================================================

  const createTransaction = useMutation(api.transactions.createTransaction);
  const updateTransaction = useMutation(api.transactions.updateTransaction);
  const deleteTransactionMutation = useMutation(api.transactions.deleteTransaction);
  const reconcileTransaction = useMutation(api.transactions.reconcileTransaction);

  // =========================================================================
  // DERIVED DATA
  // =========================================================================

  const filteredAllTransactions = useMemo(() => {
    if (!allTransactions) return allTransactions;

    let filtered = allTransactions;

    // Apply type filter
    if (transactionFilter === "income") {
      filtered = filtered.filter((tx) => tx.transaction.type === "income");
    } else if (transactionFilter === "expense") {
      filtered = filtered.filter((tx) => tx.transaction.type === "expense");
    } else if (transactionFilter === "reconciled") {
      filtered = filtered.filter((tx) => tx.transaction.reconciled === true);
    } else if (transactionFilter === "unreconciled") {
      filtered = filtered.filter((tx) => tx.transaction.reconciled !== true);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (tx) =>
          tx.transaction.description.toLowerCase().includes(query) ||
          tx.transaction.reference?.toLowerCase().includes(query) ||
          tx.fund?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allTransactions, transactionFilter, searchQuery]);

  const allTransactionsTotals = useMemo(() => {
    if (!filteredAllTransactions) return { income: 0, expense: 0 };

    return filteredAllTransactions.reduce(
      (acc, row) => {
        if (row.transaction.type === "income") {
          acc.income += row.transaction.amount;
        } else {
          acc.expense += row.transaction.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [filteredAllTransactions]);

  // =========================================================================
  // EFFECTS
  // =========================================================================

  // Auto-expand current period
  useEffect(() => {
    if (periods && periods.length > 0) {
      const currentKey = periodToKey(periods[0]);
      setExpandedPeriods(new Set([currentKey]));
    }
  }, [periods]);

  // =========================================================================
  // HELPERS
  // =========================================================================

  const showFeedback = useCallback((type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }, []);

  const togglePeriod = useCallback((year: number, month: number) => {
    const key = `${year}-${month}`;
    setExpandedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const openEditDialog = useCallback((transaction: Doc<"transactions">) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  }, []);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleCreateTransactions = useCallback(
    async (transactions: TransactionCreateValues[]) => {
      if (!canRecordManualTransactions) {
        showFeedback("error", "You do not have permission to record transactions.");
        return;
      }
      for (const transaction of transactions) {
        await createTransaction(transaction);
      }
      showFeedback(
        "success",
        `Successfully recorded ${transactions.length} transaction${transactions.length > 1 ? "s" : ""}.`
      );
    },
    [canRecordManualTransactions, createTransaction, showFeedback]
  );

  const handleUpdateTransaction = useCallback(
    async (transactionId: Id<"transactions">, updates: TransactionUpdateValues) => {
      if (!canManageTransactions) {
        showFeedback("error", "You do not have permission to update transactions.");
        return;
      }

      const previousCategory = editingTransaction?.categoryId;
      const nextCategory = updates.categoryId;

      await updateTransaction({ transactionId, ...updates });

      // Record AI feedback if category changed
      if (churchId && nextCategory && nextCategory !== previousCategory && editingTransaction) {
        await convex.mutation(api.ai.recordFeedback, {
          churchId,
          description: editingTransaction.description,
          amount: editingTransaction.amount,
          categoryId: nextCategory,
          confidence: 0.9,
          userId: user?._id,
        });
      }

      showFeedback("success", "Transaction updated successfully.");
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
    },
    [
      canManageTransactions,
      churchId,
      convex,
      editingTransaction,
      showFeedback,
      updateTransaction,
      user?._id,
    ]
  );

  const handleQuickUpdateTransaction = useCallback(
    async (updates: TransactionUpdateValues) => {
      if (!editingTransaction) return;
      await handleUpdateTransaction(editingTransaction._id, updates);
    },
    [editingTransaction, handleUpdateTransaction]
  );

  const handleDelete = useCallback(
    async (transactionId: Id<"transactions">) => {
      if (!canManageTransactions) {
        showFeedback("error", "You do not have permission to delete transactions.");
        return;
      }
      await deleteTransactionMutation({ transactionId });
      if (editingTransaction?._id === transactionId) {
        setEditingTransaction(null);
      }
      showFeedback("success", "Transaction removed from the ledger.");
    },
    [canManageTransactions, deleteTransactionMutation, editingTransaction, showFeedback]
  );

  const handleToggleReconciled = useCallback(
    async (transactionId: Id<"transactions">, reconciled: boolean) => {
      if (!canManageTransactions) {
        showFeedback("error", "You do not have permission to reconcile transactions.");
        return;
      }
      await reconcileTransaction({ transactionId, reconciled });
      showFeedback(
        "success",
        reconciled ? "Marked transaction as reconciled." : "Transaction set back to unreconciled."
      );
    },
    [canManageTransactions, reconcileTransaction, showFeedback]
  );

  const handleRequestReceipt = useCallback(
    async (transaction: Doc<"transactions">) => {
      if (!canViewFinancialData) {
        showFeedback("error", "You do not have permission to view receipts.");
        return;
      }

      if (!transaction.receiptStorageId) return;

      try {
        const params = new URLSearchParams();
        if (churchId) params.set("churchId", churchId);

        const query = params.toString();
        const response = await fetch(
          query.length > 0
            ? `/api/files/receipts/${transaction.receiptStorageId}?${query}`
            : `/api/files/receipts/${transaction.receiptStorageId}`
        );
        const payload = (await response.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;

        if (response.ok && payload?.url) {
          window.open(payload.url, "_blank", "noopener,noreferrer");
        } else {
          showFeedback("error", payload?.error ?? "Receipt could not be found.");
        }
      } catch (error) {
        console.error("Failed to fetch receipt URL", error);
        showFeedback("error", "Receipt could not be found.");
      }
    },
    [canViewFinancialData, churchId, showFeedback]
  );

  const handleSuggestCategory = useCallback(
    async (transaction: Doc<"transactions">) => {
      if (!canManageTransactions) {
        showFeedback("error", "You do not have permission to categorise transactions.");
        return;
      }

      if (!categories || !churchId) return;

      const suggestion = await convex.mutation(api.ai.suggestCategory, {
        churchId,
        description: transaction.description,
        amount: transaction.amount,
        categories: (categories as Doc<"categories">[]).map((category) => ({
          id: category._id,
          name: category.name,
          type: category.type,
        })),
      });

      if (suggestion?.categoryId) {
        const suggestedCategoryId = suggestion.categoryId as Id<"categories">;
        const suggestedCategory = (categories as Doc<"categories">[]).find(
          (category) => category._id === suggestedCategoryId
        );

        await updateTransaction({
          transactionId: transaction._id,
          categoryId: suggestedCategoryId,
        });
        await convex.mutation(api.ai.recordFeedback, {
          churchId,
          description: transaction.description,
          amount: transaction.amount,
          categoryId: suggestedCategoryId,
          confidence: suggestion.confidence,
          userId: user?._id,
        });

        const suggestionLabel = suggestedCategory ? ` (${suggestedCategory.name})` : "";
        const confidencePercentage = Math.round(suggestion.confidence * 100);

        showFeedback(
          "success",
          `Categorised using AI suggestion${suggestionLabel} at ${confidencePercentage}% confidence.`
        );
      } else {
        showFeedback("error", "No confident suggestion available yet.");
      }
    },
    [canManageTransactions, categories, churchId, convex, showFeedback, updateTransaction, user?._id]
  );

  return {
    // State
    churchId,
    viewMode,
    setViewMode,
    expandedPeriods,
    feedback,
    isDialogOpen,
    setIsDialogOpen,
    editingTransaction,
    isEditDialogOpen,
    setIsEditDialogOpen,
    searchQuery,
    setSearchQuery,
    transactionFilter,
    setTransactionFilter,

    // Data
    funds,
    categories,
    donors,
    periods,
    multiPeriodSummary,
    trendData,
    filteredAllTransactions,
    allTransactionsTotals,

    // Permissions
    canManageTransactions,
    canRecordManualTransactions,
    canViewFinancialData,
    showLedger,

    // Actions
    togglePeriod,
    handleCreateTransactions,
    handleUpdateTransaction,
    handleQuickUpdateTransaction,
    handleDelete,
    handleToggleReconciled,
    handleRequestReceipt,
    handleSuggestCategory,
    openEditDialog,
  };
}
