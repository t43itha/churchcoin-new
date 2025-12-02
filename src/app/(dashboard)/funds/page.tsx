"use client";

import { Banknote, LineChart, PiggyBank, PlusCircle } from "lucide-react";

import { FundCard } from "@/components/funds/fund-card";
import { FundForm } from "@/components/funds/fund-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/lib/convexGenerated";
import { formatCurrency } from "@/lib/formats";
import { useFundsPage } from "@/hooks/pages/use-funds-page";

export default function FundsPage() {
  const {
    // State
    churchId,
    setChurchId,
    isCreateOpen,
    isCreateSubmitting,
    createError,
    setEditingFundId,
    isUpdateSubmitting,
    updateError,

    // Data
    churches,
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
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-grey-mid">
                <PiggyBank className="h-5 w-5 text-grey-mid" />
                <span className="text-sm uppercase tracking-wide">Fund Management</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Church funds overview</h1>
              <p className="text-sm text-grey-mid">
                Monitor balances across every fund, capture restrictions, and drill into the running ledger.
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
              <Button
                className="font-primary"
                onClick={openCreateDialog}
                disabled={!churchId}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New fund
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-ledger">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                  <Banknote className="h-4 w-4 text-grey-mid" />
                  Total balance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-ink">
                {formatCurrency(totals.balance)}
              </CardContent>
            </Card>
            <Card className="border-ledger">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                  <LineChart className="h-4 w-4 text-grey-mid" />
                  Year-to-date movement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-success">+{formatCurrency(totals.income)}</span>
                  <span className="text-sm text-error">-{formatCurrency(totals.expense)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-ledger">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                  <PiggyBank className="h-4 w-4 text-grey-mid" />
                  Funds tracked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-2xl font-semibold text-ink">
                  {totals.count}
                  <div className="flex gap-2 text-xs text-grey-mid">
                    <Badge variant="outline" className="border-ledger text-grey-mid">
                      General {totals.byType.general ?? 0}
                    </Badge>
                    <Badge variant="outline" className="border-ledger text-grey-mid">
                      Restricted {totals.byType.restricted ?? 0}
                    </Badge>
                    <Badge variant="outline" className="border-ledger text-grey-mid">
                      Designated {totals.byType.designated ?? 0}
                    </Badge>
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
          <div className="rounded-lg border border-dashed border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            Add a church to Convex and select it to begin tracking funds.
          </div>
        )}
        {churchId && fundsOverview === undefined && (
          <div className="rounded-lg border border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            Loading fund information…
          </div>
        )}
        {churchId && fundsOverview?.length === 0 && (
          <div className="rounded-lg border border-dashed border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            No funds created yet. Use the &ldquo;New fund&rdquo; button to get started.
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
        <DialogContent className="max-w-2xl border-ledger bg-paper font-primary">
          <DialogHeader>
            <DialogTitle className="text-xl text-ink">Create new fund</DialogTitle>
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
        <DialogContent className="max-w-2xl border-ledger bg-paper font-primary">
          <DialogHeader>
            <DialogTitle className="text-xl text-ink">Edit fund</DialogTitle>
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
