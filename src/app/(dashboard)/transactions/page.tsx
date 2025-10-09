"use client";

import { useEffect, useMemo, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { PlusCircle } from "lucide-react";

import {
  ManualTransactionDialog,
  type TransactionCreateValues,
} from "@/components/transactions/manual-transaction-dialog";
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog";
import {
  TransactionLedger,
  type TransactionLedgerRow,
} from "@/components/transactions/transaction-ledger";
import { PeriodSelector, type PeriodViewMode } from "@/components/transactions/period-selector";
import { MultiPeriodOverview } from "@/components/transactions/multi-period-overview";
import { PeriodCard } from "@/components/transactions/period-card";
import { SearchFilterBar, type FilterOption } from "@/components/common/search-filter-bar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Doc, type Id } from "@/lib/convexGenerated";
import { useSession } from "@/components/auth/session-provider";
import { getRolePermissions } from "@/lib/rbac";
import { getLastNMonths, getCurrentPeriod, periodToKey } from "@/lib/periods";

const TRANSACTION_FILTER_OPTIONS: FilterOption<"all" | "income" | "expense" | "reconciled" | "unreconciled">[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "reconciled", label: "Reconciled" },
  { value: "unreconciled", label: "Unreconciled" },
];

export default function TransactionsPage() {
  const convex = useConvex();
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [viewMode, setViewMode] = useState<PeriodViewMode>("last-6");
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Doc<"transactions"> | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState<"all" | "income" | "expense" | "reconciled" | "unreconciled">("all");
  const { user } = useSession();
  const permissions = useMemo(
    () => getRolePermissions(user?.role),
    [user?.role]
  );
  const canManageTransactions = permissions.canManageFinancialData;
  const canRecordManualTransactions = permissions.canRecordManualTransactions;
  const canViewFinancialData = permissions.canViewFinancialData;
  const showLedger = canViewFinancialData && !permissions.restrictedToManualEntry;

  // Calculate periods based on view mode
  const periods = useMemo(() => {
    switch (viewMode) {
      case "current":
        return [getCurrentPeriod()];
      case "last-3":
        return getLastNMonths(3);
      case "last-6":
        return getLastNMonths(6);
      case "all":
        return null; // Will use old query
      default:
        return getLastNMonths(6);
    }
  }, [viewMode]);

  const funds = useQuery(
    api.funds.getFunds,
    churchId ? { churchId } : "skip"
  );
  const categories = useQuery(
    api.categories.getCategories,
    churchId ? { churchId } : "skip"
  );
  const donors = useQuery(
    api.donors.getDonors,
    churchId ? { churchId } : "skip"
  );

  // Load multi-period summary
  const multiPeriodSummary = useQuery(
    api.transactions.getMultiPeriodSummary,
    churchId && periods ? { churchId, periods } : "skip"
  );

  // Load trend data for overview
  const trendData = useQuery(
    api.transactions.getPeriodTrends,
    churchId && periods && periods.length > 1 ? { churchId, periods } : "skip"
  );

  // Fallback for "All" mode - use old query
  const allTransactions = useQuery(
    api.transactions.getLedger,
    churchId && viewMode === "all" ? { churchId, limit: 1000 } : "skip"
  );

  // Filter transactions based on search and filter
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
      filtered = filtered.filter((tx) =>
        tx.transaction.description.toLowerCase().includes(query) ||
        tx.transaction.reference?.toLowerCase().includes(query) ||
        tx.fund?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allTransactions, transactionFilter, searchQuery]);

  const createTransaction = useMutation(api.transactions.createTransaction);
  const updateTransaction = useMutation(api.transactions.updateTransaction);
  const deleteTransactionMutation = useMutation(api.transactions.deleteTransaction);
  const reconcileTransaction = useMutation(api.transactions.reconcileTransaction);

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  // Auto-expand current period
  useEffect(() => {
    if (periods && periods.length > 0) {
      const currentKey = periodToKey(periods[0]);
      setExpandedPeriods(new Set([currentKey]));
    }
  }, [periods]);

  const togglePeriod = (year: number, month: number) => {
    const key = `${year}-${month}`;
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleCreateTransactions = async (transactions: TransactionCreateValues[]) => {
    if (!canRecordManualTransactions) {
      setFeedback({
        type: "error",
        message: "You do not have permission to record transactions.",
      });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }
    for (const transaction of transactions) {
      await createTransaction(transaction);
    }
    setFeedback({
      type: "success",
      message: `Successfully recorded ${transactions.length} transaction${transactions.length > 1 ? "s" : ""}.`,
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleUpdateTransaction = async (transactionId: Id<"transactions">, updates: {
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
  }) => {
    if (!canManageTransactions) {
      setFeedback({
        type: "error",
        message: "You do not have permission to update transactions.",
      });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }

    const previousCategory = editingTransaction?.categoryId;
    const nextCategory = updates.categoryId;

    await updateTransaction({
      transactionId,
      ...updates,
    });

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

    setFeedback({
      type: "success",
      message: "Transaction updated successfully.",
    });
    setTimeout(() => setFeedback(null), 5000);
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
  };

  const handleQuickUpdateTransaction = async (updates: {
    date: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    fundId: Id<"funds">;
    categoryId?: Id<"categories">;
    donorId?: Id<"donors">;
    method?: string;
    reference?: string;
    giftAid?: boolean;
    notes?: string;
  }) => {
    if (!editingTransaction) return;
    await handleUpdateTransaction(editingTransaction._id, updates);
  };

  const handleDelete = async (transactionId: Id<"transactions">) => {
    if (!canManageTransactions) {
      setFeedback({
        type: "error",
        message: "You do not have permission to delete transactions.",
      });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }
    await deleteTransactionMutation({ transactionId });
    if (editingTransaction?._id === transactionId) {
      setEditingTransaction(null);
    }
    setFeedback({ type: "success", message: "Transaction removed from the ledger." });
  };

  const handleToggleReconciled = async (transactionId: Id<"transactions">, reconciled: boolean) => {
    if (!canManageTransactions) {
      setFeedback({
        type: "error",
        message: "You do not have permission to reconcile transactions.",
      });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }
    await reconcileTransaction({ transactionId, reconciled });
    setFeedback({
      type: "success",
      message: reconciled ? "Marked transaction as reconciled." : "Transaction set back to unreconciled.",
    });
  };

  const handleRequestReceipt = async (transaction: Doc<"transactions">) => {
    if (!canViewFinancialData) {
      setFeedback({
        type: "error",
        message: "You do not have permission to view receipts.",
      });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }

    if (!transaction.receiptStorageId) {
      return;
    }

    const url = await convex.query(api.files.getReceiptUrl, {
      storageId: transaction.receiptStorageId,
    });

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setFeedback({ type: "error", message: "Receipt could not be found." });
    }
  };

  const handleSuggestCategory = async (transaction: Doc<"transactions">) => {
    if (!canManageTransactions) {
      setFeedback({
        type: "error",
        message: "You do not have permission to categorise transactions.",
      });
      setTimeout(() => setFeedback(null), 5000);
      return;
    }

    if (!categories || !churchId) {
      return;
    }

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

      const suggestionLabel = suggestedCategory
        ? ` (${suggestedCategory.name})`
        : "";
      const confidencePercentage = Math.round(suggestion.confidence * 100);

      setFeedback({
        type: "success",
        message: `Categorised using AI suggestion${suggestionLabel} at ${confidencePercentage}% confidence.`,
      });
    } else {
      setFeedback({ type: "error", message: "No confident suggestion available yet." });
    }
  };


  // Render loading state
  if (!churches) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16">
          <div className="h-10 w-40 rounded-md bg-ledger" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-96 rounded-lg border border-ledger bg-ledger/50" />
            <div className="space-y-4">
              <div className="h-64 rounded-lg border border-ledger bg-ledger/50" />
              <div className="h-40 rounded-lg border border-ledger bg-ledger/50" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!churchId || !funds || !categories || !donors) {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper pb-12">
      {/* Header */}
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-ink">Transactions Hub</h1>
              <p className="text-sm text-grey-mid">
                View and manage transactions across different periods with powerful insights.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <Select
                value={churchId ?? undefined}
                onValueChange={(value) => setChurchId(value as Id<"churches">)}
                disabled={!churches?.length}
              >
                <SelectTrigger className="min-w-[220px] border-ledger font-primary">
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
              {canRecordManualTransactions && (
                <Button
                  className="font-primary"
                  onClick={() => setIsDialogOpen(true)}
                  disabled={!churchId}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Transaction
                </Button>
              )}
            </div>
          </div>

          {/* Period Selector */}
          <PeriodSelector value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        {feedback && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-success/40 bg-success/10 text-success"
                : "border-error/40 bg-error/10 text-error"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {!churchId && (
          <div className="rounded-lg border border-dashed border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            Add a church to Convex and select it to begin tracking transactions.
          </div>
        )}

        {!showLedger && canRecordManualTransactions && (
          <div className="rounded-lg border border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            You can record transactions using the manual entry form. Financial ledgers are hidden for this access level.
          </div>
        )}

        {/* Multi-Period Overview */}
        {showLedger && trendData && trendData.length > 1 && (
          <MultiPeriodOverview trends={trendData} />
        )}

        {/* Search and Filter */}
        {showLedger && (
          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search transactions..."
            filterValue={transactionFilter}
            onFilterChange={setTransactionFilter}
            filterOptions={TRANSACTION_FILTER_OPTIONS}
          />
        )}

        {/* Period Cards */}
        {showLedger && multiPeriodSummary && periods && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-ink font-primary">
              Period Breakdown
            </h2>
            {multiPeriodSummary
              .map((summary, index) => ({ summary, period: periods[index] }))
              .filter(({ summary }) => summary.count > 0)
              .map(({ summary, period }) => {
                const key = `${period.year}-${period.month}`;
                return (
                  <PeriodCard
                    key={key}
                    period={period}
                    churchId={churchId}
                    summary={summary}
                    isExpanded={expandedPeriods.has(key)}
                    onToggle={() => togglePeriod(period.year, period.month)}
                    onEdit={canManageTransactions ? (tx) => {
                      setEditingTransaction(tx);
                      setIsEditDialogOpen(true);
                    } : undefined}
                    onDelete={canManageTransactions ? handleDelete : undefined}
                    onToggleReconciled={canManageTransactions ? handleToggleReconciled : undefined}
                    onRequestReceipt={canViewFinancialData ? handleRequestReceipt : undefined}
                    onSuggestCategory={canManageTransactions ? handleSuggestCategory : undefined}
                  />
                );
              })}
          </div>
        )}

        {/* Fallback for "All" mode */}
        {showLedger && viewMode === "all" && filteredAllTransactions && (
          <div className="rounded-lg border border-ledger bg-paper p-6">
            <h2 className="text-xl font-semibold text-ink font-primary mb-4">
              All Transactions
            </h2>
            <TransactionLedger
              rows={filteredAllTransactions as TransactionLedgerRow[]}
              onEdit={canManageTransactions ? (tx) => {
                setEditingTransaction(tx);
                setIsEditDialogOpen(true);
              } : undefined}
              onDelete={canManageTransactions ? handleDelete : undefined}
              onToggleReconciled={canManageTransactions ? handleToggleReconciled : undefined}
              onRequestReceipt={canViewFinancialData ? handleRequestReceipt : undefined}
              onSuggestCategory={canManageTransactions ? handleSuggestCategory : undefined}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      {canRecordManualTransactions && churchId && funds && categories && donors && (
        <>
          <ManualTransactionDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            churchId={churchId}
            funds={funds as Doc<"funds">[]}
            categories={categories as Doc<"categories">[]}
            donors={donors as Doc<"donors">[]}
            onSubmit={handleCreateTransactions}
          />

          {canManageTransactions && editingTransaction && (
            <EditTransactionDialog
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              transaction={editingTransaction}
              funds={funds as Doc<"funds">[]}
              categories={categories as Doc<"categories">[]}
              donors={donors as Doc<"donors">[]}
              onSubmit={handleQuickUpdateTransaction}
            />
          )}
        </>
      )}
    </div>
  );
}
