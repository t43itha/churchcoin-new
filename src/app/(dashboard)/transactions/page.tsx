"use client";

import { PlusCircle } from "lucide-react";

import {
  BulkTransactionDialog,
} from "@/components/transactions/bulk-transaction-dialog";
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog";
import {
  TransactionLedger,
  type TransactionLedgerRow,
} from "@/components/transactions/transaction-ledger";
import { PeriodSelector } from "@/components/transactions/period-selector";
import { MultiPeriodOverview } from "@/components/transactions/multi-period-overview";
import { PeriodCard } from "@/components/transactions/period-card";
import { SearchFilterBar, type FilterOption } from "@/components/common/search-filter-bar";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/lib/convexGenerated";
import { formatCurrency } from "@/lib/formats";
import { useTransactionsPage } from "@/hooks/pages";

const TRANSACTION_FILTER_OPTIONS: FilterOption<"all" | "income" | "expense" | "reconciled" | "unreconciled">[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "reconciled", label: "Reconciled" },
  { value: "unreconciled", label: "Unreconciled" },
];

export default function TransactionsPage() {
  const {
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
    handleQuickUpdateTransaction,
    handleDelete,
    handleToggleReconciled,
    handleRequestReceipt,
    handleSuggestCategory,
    openEditDialog,
  } = useTransactionsPage();

  // Render loading state
  if (!churchId) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16">
          <div className="h-10 w-40 rounded-md bg-ink/10" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-96 rounded-lg border border-ink/10 bg-ink/5" />
            <div className="space-y-4">
              <div className="h-64 rounded-lg border border-ink/10 bg-ink/5" />
              <div className="h-40 rounded-lg border border-ink/10 bg-ink/5" />
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
      <div className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-ink">Transactions Hub</h1>
              <p className="text-sm text-grey-mid leading-relaxed">
                View and manage transactions across different periods with powerful insights.
              </p>
            </div>

            {canRecordManualTransactions && (
              <Button
                className="bg-ink text-white hover:bg-ink/90 font-medium shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_#d4a574] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                onClick={() => setIsDialogOpen(true)}
                disabled={!churchId}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Transaction
              </Button>
            )}
          </div>

          {/* Period Selector */}
          <PeriodSelector value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        {feedback && (
          <div
            className={`swiss-card rounded-lg border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-sage bg-sage-light/50 text-sage-dark"
                : "border-error bg-error-light text-error"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {!churchId && (
          <div className="swiss-card rounded-lg border-2 border-dashed border-ink/20 bg-white px-6 py-12 text-center">
            <p className="text-grey-mid">Add a church to Convex and select it to begin tracking transactions.</p>
          </div>
        )}

        {!showLedger && canRecordManualTransactions && (
          <div className="swiss-card rounded-lg border border-ink bg-white px-6 py-10 text-center">
            <p className="text-grey-mid">You can record transactions using the manual entry form. Financial ledgers are hidden for this access level.</p>
          </div>
        )}

        {/* Multi-Period Overview */}
        {showLedger && trendData && trendData.length > 1 && (
          <MultiPeriodOverview trends={trendData} />
        )}

        {/* Period Cards */}
        {showLedger && multiPeriodSummary && periods && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-ink">
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
                    onEdit={canManageTransactions ? openEditDialog : undefined}
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
          <div className="swiss-card rounded-lg border border-ink bg-white p-6 space-y-6">
            <h2 className="text-xl font-semibold text-ink">
              All Transactions
            </h2>

            {/* KPI Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="swiss-badge bg-ink text-white">
                {filteredAllTransactions.length} entries
              </span>
              <span className="swiss-badge bg-sage-light text-sage-dark border border-sage">
                Income {formatCurrency(allTransactionsTotals.income)}
              </span>
              <span className="swiss-badge bg-error-light text-error border border-error">
                Expenses {formatCurrency(allTransactionsTotals.expense)}
              </span>
              <span className="text-sm font-[family-name:var(--font-mono)] font-medium text-ink">
                Net {formatCurrency(allTransactionsTotals.income - allTransactionsTotals.expense)}
              </span>
            </div>

            {/* Search and Filter */}
            <SearchFilterBar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search transactions..."
              filterValue={transactionFilter}
              onFilterChange={setTransactionFilter}
              filterOptions={TRANSACTION_FILTER_OPTIONS}
            />

            <TransactionLedger
              rows={filteredAllTransactions as TransactionLedgerRow[]}
              totalRows={filteredAllTransactions?.length}
              onEdit={canManageTransactions ? openEditDialog : undefined}
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
          <BulkTransactionDialog
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
