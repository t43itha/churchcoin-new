"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Banknote, LineChart, PiggyBank, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { FundCard, type FundCardSummary } from "@/components/funds/fund-card";
import { FundForm, type FundFormValues } from "@/components/funds/fund-form";
import { type FundOverview } from "@/components/funds/types";
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
import { api, type Id } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

export default function FundsPage() {
  const router = useRouter();
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingFundId, setEditingFundId] = useState<Id<"funds"> | null>(null);
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

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

  const editingFund = editingFundId ? fundLookup.get(editingFundId) ?? null : null;

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
      isFundraising: entry.fund.isFundraising ?? false,
      fundraisingTarget: entry.fund.fundraisingTarget ?? null,
      fundraisingRaised: entry.incomeTotal,
      fundraisingPledged: entry.fundraising?.pledgedTotal ?? 0,
      outstandingToTarget: entry.fundraising?.outstandingToTarget ?? null,
      supporterCount: entry.fundraising?.supporterCount ?? 0,
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
        isFundraising: values.isFundraising,
        fundraisingTarget: values.isFundraising
          ? values.fundraisingTarget ?? null
          : null,
      });
      setEditingFundId(null);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Unable to update fund");
    } finally {
      setIsUpdateSubmitting(false);
    }
  };

  return (
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
            No funds created yet. Use the &ldquo;New fund&rdquo; button to get started.
          </div>
        ) : null}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fundCards.map((fund) => (
            <FundCard
              key={fund.id}
              fund={fund}
              onSelect={() => router.push(`/funds/${fund.id}`)}
              onEdit={() => setEditingFundId(fund.id as Id<"funds">)}
            />
          ))}
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl border-ledger bg-paper font-primary">
          <DialogHeader>
            <DialogTitle className="text-xl text-ink">Create new fund</DialogTitle>
          </DialogHeader>
          <FundForm
            onSubmit={handleCreateFund}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={isCreateSubmitting}
            errorMessage={createError}
            submitLabel="Create fund"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingFund)} onOpenChange={(open) => !open && setEditingFundId(null)}>
        <DialogContent className="max-w-2xl border-ledger bg-paper font-primary">
          <DialogHeader>
            <DialogTitle className="text-xl text-ink">Edit fund</DialogTitle>
          </DialogHeader>
          {editingFund ? (
            <FundForm
              onSubmit={handleUpdateFund}
              onCancel={() => setEditingFundId(null)}
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
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
