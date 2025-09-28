"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarCheck, NotebookPen, Upload } from "lucide-react";

import { SundayCollectionCard } from "@/components/transactions/sunday-collection-card";
import {
  TransactionForm,
  type TransactionFormValues,
} from "@/components/transactions/transaction-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Doc, type Id } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

type Feedback = {
  type: "success" | "error";
  message: string;
};

export default function TransactionsPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

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

  const createTransaction = useMutation(api.transactions.createTransaction);

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  const activeChurch = useMemo(() => {
    return churches?.find((church) => church._id === churchId) ?? null;
  }, [churches, churchId]);

  const handleManualSubmit = async (values: TransactionFormValues) => {
    if (!churchId) {
      throw new Error("Select a church before recording transactions");
    }

    await createTransaction({
      churchId: values.churchId as Id<"churches">,
      date: values.date,
      description: values.description.trim(),
      amount: values.amount,
      type: values.type,
      fundId: values.fundId as Id<"funds">,
      categoryId: values.categoryId ? (values.categoryId as Id<"categories">) : undefined,
      donorId: values.donorId ? (values.donorId as Id<"donors">) : undefined,
      method: values.method,
      reference: values.reference,
      giftAid: values.giftAid,
      notes: values.notes,
      enteredByName: values.enteredByName,
      source: "manual",
    });
  };

  const handleSundaySubmit = async (entries: TransactionFormValues[]) => {
    if (!churchId) {
      throw new Error("Select a church before recording Sunday collections");
    }

    for (const entry of entries) {
      await createTransaction({
        churchId: entry.churchId as Id<"churches">,
        date: entry.date,
        description: entry.description,
        amount: entry.amount,
        type: entry.type,
        fundId: entry.fundId as Id<"funds">,
        categoryId: entry.categoryId ? (entry.categoryId as Id<"categories">) : undefined,
        donorId: entry.donorId ? (entry.donorId as Id<"donors">) : undefined,
        method: entry.method,
        reference: entry.reference,
        giftAid: entry.giftAid,
        notes: entry.notes,
        enteredByName: entry.enteredByName,
        source: "manual",
      });
    }

    setFeedback({
      type: "success",
      message: `Recorded ${entries.length} Sunday collection entr${entries.length === 1 ? "y" : "ies"}.`,
    });
  };

  const ledgerSnapshot = useMemo(() => {
    if (!funds) {
      return { count: 0, balance: 0 };
    }

    return funds.reduce(
      (acc, fund) => {
        acc.count += 1;
        acc.balance += fund.balance;
        return acc;
      },
      { count: 0, balance: 0 }
    );
  }, [funds]);

  const incomeCategories = useMemo(() => {
    return (categories ?? []).filter(
      (category: Doc<"categories">) => category.type === "income"
    );
  }, [categories]);

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
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-grey-mid">
                <NotebookPen className="h-5 w-5 text-grey-mid" />
                <span className="text-sm uppercase tracking-wide">Manual entry</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Manual transaction entry</h1>
              <p className="text-sm text-grey-mid">
                Capture offerings, reimbursements, and corrections straight into the ledger with audit-ready context.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <span className="text-xs uppercase tracking-wide text-grey-mid">Active church</span>
              <Select
                value={churchId}
                onValueChange={(value) => setChurchId(value as Id<"churches">)}
              >
                <SelectTrigger className="w-[240px] font-primary">
                  <SelectValue placeholder="Select church" />
                </SelectTrigger>
                <SelectContent className="font-primary">
                  {churches.map((church) => (
                    <SelectItem key={church._id} value={church._id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeChurch ? (
                <p className="text-xs text-grey-mid">
                  FY end {activeChurch.settings.fiscalYearEnd} · Gift Aid {activeChurch.settings.giftAidEnabled ? "enabled" : "disabled"}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-grey-mid">
            <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
              {ledgerSnapshot.count} active funds
            </Badge>
            <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
              Ledger balance {currency.format(ledgerSnapshot.balance)}
            </Badge>
            <div className="flex items-center gap-2 rounded-md border border-ledger bg-highlight px-3 py-1.5">
              <CalendarCheck className="h-4 w-4 text-grey-mid" />
              <span>CSV imports coming in iteration 4</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        {feedback ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-success/40 bg-success/10 text-success"
                : "border-error/40 bg-error/10 text-error"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[2fr,1.1fr]">
          <TransactionForm
            churchId={churchId}
            funds={funds as Doc<"funds">[]}
            categories={categories as Doc<"categories">[]}
            donors={donors as Doc<"donors">[]}
            onSubmit={handleManualSubmit}
            onSubmitSuccess={() => {
              setFeedback({
                type: "success",
                message: "Manual transaction recorded successfully.",
              });
            }}
          />
          <div className="space-y-6">
            <SundayCollectionCard
              churchId={churchId}
              funds={funds as Doc<"funds">[]}
              categories={incomeCategories as Doc<"categories">[]}
              onCreate={handleSundaySubmit}
              defaultFundId={funds[0]?._id}
            />
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink">Upcoming: bulk import</CardTitle>
                <CardDescription className="text-grey-mid">
                  Iteration 4 introduces CSV uploads with AI-assisted matching. Prep your bank exports in the <code>public/csv-samples</code> folder.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-grey-mid">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-grey-mid" />
                  Barclays & HSBC templates ready
                </div>
                <Button
                  variant="outline"
                  className="w-fit border-ledger font-primary"
                  asChild
                >
                  <a href="/csv-samples">View sample CSVs</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
