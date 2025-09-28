"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Banknote, LineChart, PiggyBank, PlusCircle } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { FundCard, type FundCardSummary } from "@/components/funds/fund-card";
import { FundForm, type FundFormValues } from "@/components/funds/fund-form";
import { FundLedger } from "@/components/funds/fund-ledger";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api, type Doc, type Id } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

type FundOverview = {
  fund: Doc<"funds">;
  incomeTotal: number;
  expenseTotal: number;
  lastTransactionDate: string | null;
  runningBalance: {
    transactionId: Id<"transactions">;
    date: string;
    description: string;
    type: "income" | "expense";
    amount: number;
    balance: number;
  }[];
};

export default function FundsPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingFund, setEditingFund] = useState<FundOverview | null>(null);
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [viewingFund, setViewingFund] = useState<FundOverview | null>(null);

  const fundsOverview = useQuery(
    api.funds.getFundsOverview,
    churchId ? { churchId } : "skip"
  );

  const createFund = useMutation(api.funds.createFund);
  const updateFund = useMutation(api.funds.updateFund);

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churchId, churches]);

  const fundLookup = useMemo(() => {
    if (!fundsOverview) {
      return new Map<Id<"funds">, FundOverview>();
    }

    return new Map<Id<"funds">, FundOverview>(
      fundsOverview.map((entry) => [entry.fund._id, entry])
    );
  }, [fundsOverview]);

  const fundCards = useMemo<FundCardSummary[]>(() => {
    if (!fundsOverview) {
      return [];
    }

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
    }));
  }, [fundsOverview]);

  const totals = useMemo(() => {
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

  const handleCreateFund = async (values: FundFormValues) => {
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
        description: values.description?.trim()
          ? values.description.trim()
          : undefined,
        restrictions: values.restrictions?.trim()
          ? values.restrictions.trim()
          : undefined,
      });
      setIsCreateOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create fund");
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  const handleUpdateFund = async (values: FundFormValues) => {
    if (!editingFund) {
      return;
    }

    setIsUpdateSubmitting(true);
    setUpdateError(null);

    try {
      await updateFund({
        fundId: editingFund.fund._id,
        name: values.name.trim(),
        type: values.type,
        description: values.description?.trim()
          ? values.description.trim()
          : null,
        restrictions: values.restrictions?.trim()
          ? values.restrictions.trim()
          : null,
      });
      setEditingFund(null);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Unable to update fund");
    } finally {
      setIsUpdateSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-paper pb-12">
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
                onClick={() => {
                  setCreateError(null);
                  setIsCreateOpen(true);
                }}
                disabled={!churchId}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New fund
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-ledger">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                  <Banknote className="h-4 w-4 text-grey-mid" />
                  Total balance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-ink">
                {currency.format(totals.balance)}
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
                  <span className="text-sm text-success">+{currency.format(totals.income)}</span>
                  <span className="text-sm text-error">-{currency.format(totals.expense)}</span>
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

      <div className="mx-auto max-w-6xl px-6 py-10">
        {!churchId ? (
          <div className="rounded-lg border border-dashed border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            Add a church to Convex and select it to begin tracking funds.
          </div>
        ) : null}
        {churchId && fundsOverview === undefined ? (
          <div className="rounded-lg border border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            Loading fund information…
          </div>
        ) : null}
        {churchId && fundsOverview?.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            No funds created yet. Use the “New fund” button to create your first fund.
          </div>
        ) : null}
        {fundCards.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {fundCards.map((fund) => (
              <FundCard
                key={fund.id}
                fund={fund}
                onViewLedger={() => {
                  const entry = fundLookup.get(fund.id as Id<"funds">);
                  if (entry) {
                    setViewingFund(entry);
                  }
                }}
                onEdit={() => {
                  const entry = fundLookup.get(fund.id as Id<"funds">);
                  if (entry) {
                    setUpdateError(null);
                    setEditingFund(entry);
                  }
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new fund</DialogTitle>
          </DialogHeader>
          <FundForm
            onSubmit={handleCreateFund}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={isCreateSubmitting}
            errorMessage={createError}
            submitLabel={isCreateSubmitting ? "Creating…" : "Create fund"}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingFund} onOpenChange={(open) => (!open ? setEditingFund(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit fund details</DialogTitle>
          </DialogHeader>
          {editingFund ? (
            <FundForm
              onSubmit={handleUpdateFund}
              onCancel={() => setEditingFund(null)}
              isSubmitting={isUpdateSubmitting}
              errorMessage={updateError}
              submitLabel={isUpdateSubmitting ? "Saving…" : "Save changes"}
              initialValues={{
                name: editingFund.fund.name,
                type: editingFund.fund.type,
                description: editingFund.fund.description ?? "",
                restrictions: editingFund.fund.restrictions ?? "",
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet open={!!viewingFund} onOpenChange={(open) => (!open ? setViewingFund(null) : null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          {viewingFund ? (
            <div className="flex h-full flex-col gap-4">
              <SheetHeader className="border-b border-ledger pb-4">
                <SheetTitle className="flex items-center justify-between text-ink">
                  {viewingFund.fund.name}
                  <Badge variant="outline" className="border-ledger text-grey-mid">
                    {viewingFund.fund.type}
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-grey-mid">
                  {viewingFund.fund.description || "No description provided"}
                </SheetDescription>
                <div className="flex items-center gap-6 pt-2 text-sm text-grey-mid">
                  <div>
                    <p className="uppercase tracking-wide text-xs">Current balance</p>
                    <p className="text-lg font-semibold text-ink">
                      {currency.format(viewingFund.fund.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-xs">YTD income</p>
                    <p className="text-success">
                      +{currency.format(viewingFund.incomeTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-xs">YTD expense</p>
                    <p className="text-error">
                      -{currency.format(viewingFund.expenseTotal)}
                    </p>
                  </div>
                </div>
                {viewingFund.fund.restrictions ? (
                  <div className="rounded-md border border-dashed border-ledger bg-paper px-3 py-2 text-sm text-grey-mid">
                    <span className="font-medium text-grey-dark">Restrictions:</span>
                    <span className="ml-2 text-ink">{viewingFund.fund.restrictions}</span>
                  </div>
                ) : null}
              </SheetHeader>
              <div className="flex-1 overflow-y-auto pb-8">
                <FundLedger
                  entries={viewingFund.runningBalance.map((entry) => ({
                    transactionId: entry.transactionId,
                    date: entry.date,
                    description: entry.description,
                    type: entry.type,
                    amount: entry.amount,
                    balance: entry.balance,
                  }))}
                />
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
<<<<<<< ours
<<<<<<< ours
    </div>
=======
      </div>
    </AuthGuard>
  );
}
