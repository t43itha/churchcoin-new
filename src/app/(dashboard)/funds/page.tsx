"use client";

import { Banknote, LineChart, PiggyBank, PlusCircle } from "lucide-react";

import { FundCard } from "@/components/funds/fund-card";
import { FundForm } from "@/components/funds/fund-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Id } from "@/lib/convexGenerated";
import { formatCurrency } from "@/lib/formats";
import { useFundsPage } from "@/hooks/pages/use-funds-page";

export default function FundsPage() {
  const {
    // State
    churchId,
    isCreateOpen,
    isCreateSubmitting,
    createError,
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
  } = useFundsPage();

  return (
    <div className="min-h-screen bg-paper pb-12">
      {/* Header */}
      <div className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-ink">Church funds overview</h1>
              <p className="text-sm text-grey-mid leading-relaxed">
                Monitor balances across every fund, capture restrictions, and drill into the running ledger.
              </p>
            </div>
            <Button
              className="bg-ink text-white hover:bg-ink/90 font-medium shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_#d4a574] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              onClick={openCreateDialog}
              disabled={!churchId}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New fund
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="swiss-card border border-ink bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="swiss-label flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-grey-mid">
                  <Banknote className="h-4 w-4" />
                  Total balance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-ink font-[family-name:var(--font-mono)]">
                {formatCurrency(totals.balance)}
              </CardContent>
            </Card>
            <Card className="swiss-card border border-ink bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="swiss-label flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-grey-mid">
                  <LineChart className="h-4 w-4" />
                  Year-to-date movement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between font-[family-name:var(--font-mono)] font-medium">
                  <span className="text-sage">+{formatCurrency(totals.income)}</span>
                  <span className="text-error">-{formatCurrency(totals.expense)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="swiss-card border border-ink bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="swiss-label flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-grey-mid">
                  <PiggyBank className="h-4 w-4" />
                  Funds tracked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-2xl font-bold text-ink font-[family-name:var(--font-mono)]">
                  {totals.count}
                  <div className="flex gap-2 text-xs">
                    <span className="swiss-badge bg-ink text-white">
                      General {totals.byType.general ?? 0}
                    </span>
                    <span className="swiss-badge bg-sage-light text-sage-dark border border-sage">
                      Restricted {totals.byType.restricted ?? 0}
                    </span>
                    <span className="swiss-badge bg-amber-light text-amber-dark border border-amber">
                      Designated {totals.byType.designated ?? 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        {!churchId && (
          <div className="swiss-card rounded-lg border-2 border-dashed border-ink/20 bg-white px-6 py-12 text-center">
            <p className="text-grey-mid">Add a church to Convex and select it to begin tracking funds.</p>
          </div>
        )}
        {churchId && fundsOverview === undefined && (
          <div className="swiss-card rounded-lg border border-ink bg-white px-6 py-12 text-center">
            <p className="text-grey-mid">Loading fund information…</p>
          </div>
        )}
        {churchId && fundsOverview?.length === 0 && (
          <div className="swiss-card rounded-lg border-2 border-dashed border-ink/20 bg-white px-6 py-12 text-center">
            <p className="text-grey-mid">No funds created yet. Use the &ldquo;New fund&rdquo; button to get started.</p>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fundCards.map((fund) => (
            <FundCard
              key={fund.id}
              fund={fund}
              onSelect={() => navigateToFund(fund.id as Id<"funds">)}
              onEdit={() => setEditingFundId(fund.id as Id<"funds">)}
            />
          ))}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="max-w-2xl border-2 border-ink bg-white shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-ink">Create new fund</DialogTitle>
          </DialogHeader>
          <FundForm
            onSubmit={handleCreateFund}
            onCancel={closeCreateDialog}
            isSubmitting={isCreateSubmitting}
            errorMessage={createError}
            submitLabel="Create fund"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={Boolean(editingFund)} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl border-2 border-ink bg-white shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-ink">Edit fund</DialogTitle>
          </DialogHeader>
          {editingFund && (
            <FundForm
              onSubmit={handleUpdateFund}
              onCancel={closeEditDialog}
              initialValues={{
                name: editingFund.fund.name,
                type: editingFund.fund.type,
                description: editingFund.fund.description ?? "",
                restrictions: editingFund.fund.restrictions ?? "",
                isFundraising: editingFund.fund.isFundraising ?? false,
                fundraisingTarget: editingFund.fund.fundraisingTarget ?? undefined,
              }}
              isSubmitting={isUpdateSubmitting}
              errorMessage={updateError}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
