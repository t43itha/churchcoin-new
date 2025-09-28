"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { CalendarCheck, NotebookPen, Upload } from "lucide-react";

import { SundayCollectionCard } from "@/components/transactions/sunday-collection-card";
import {
  TransactionForm,
  type TransactionFormValues,
} from "@/components/transactions/transaction-form";
import { QuickDonationDialog, type QuickEntryValues } from "@/components/transactions/quick-donation-dialog";
import {
  TransactionLedger,
  type TransactionLedgerRow,
} from "@/components/transactions/transaction-ledger";
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
  const convex = useConvex();
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Doc<"transactions"> | null>(null);
  const editingModeRef = useRef<"create" | "edit">("create");

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
  const ledger = useQuery(
    api.transactions.getLedger,
    churchId ? { churchId, limit: 200 } : "skip"
  );

  const createTransaction = useMutation(api.transactions.createTransaction);
  const updateTransaction = useMutation(api.transactions.updateTransaction);
  const deleteTransactionMutation = useMutation(api.transactions.deleteTransaction);
  const reconcileTransaction = useMutation(api.transactions.reconcileTransaction);

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

    const isEditing = Boolean(editingTransaction);
    editingModeRef.current = isEditing ? "edit" : "create";

    if (isEditing && editingTransaction) {
      await updateTransaction({
        transactionId: editingTransaction._id,
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
        receiptStorageId: values.receiptStorageId ? (values.receiptStorageId as Id<"_storage">) : undefined,
        receiptFilename: values.receiptFilename,
        removeReceipt:
          Boolean(editingTransaction.receiptStorageId) && !values.receiptStorageId,
      });
      return;
    }

    await createTransaction({
      churchId,
      date: values.date,
      description: values.description.trim(),
      amount: values.amount,
      type: values.type,
      fundId: values.fundId as Id<"funds">,
      categoryId: values.categoryId ? (values.categoryId as Id<"categories">) : undefined,
      donorId: values.donorId ? (values.donorId as Id<"donors">) : undefined,
      method: values.method,
      reference: values.reference,
      giftAid: values.type === "income" ? values.giftAid : false,
      notes: values.notes,
      enteredByName: values.enteredByName,
      source: "manual",
      receiptStorageId: values.receiptStorageId ? (values.receiptStorageId as Id<"_storage">) : undefined,
      receiptFilename: values.receiptFilename,
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

  const handleQuickEntry = async (entry: QuickEntryValues) => {
    if (!churchId) {
      throw new Error("Select a church before recording transactions");
    }

    editingModeRef.current = "create";

    await createTransaction({
      churchId,
      date: entry.date,
      description: entry.description.trim(),
      amount: entry.amount,
      type: "income",
      fundId: entry.fundId as Id<"funds">,
      categoryId: entry.categoryId ? (entry.categoryId as Id<"categories">) : undefined,
      donorId: entry.donorId ? (entry.donorId as Id<"donors">) : undefined,
      method: entry.method,
      reference: undefined,
      giftAid: Boolean(entry.giftAid),
      notes: undefined,
      enteredByName: undefined,
      source: "manual",
      receiptStorageId: undefined,
      receiptFilename: undefined,
    });

    setFeedback({ type: "success", message: "Midweek donation captured." });
  };

  const handleDelete = async (transactionId: Id<"transactions">) => {
    await deleteTransactionMutation({ transactionId });
    if (editingTransaction?._id === transactionId) {
      setEditingTransaction(null);
    }
    setFeedback({ type: "success", message: "Transaction removed from the ledger." });
  };

  const handleToggleReconciled = async (transactionId: Id<"transactions">, reconciled: boolean) => {
    await reconcileTransaction({ transactionId, reconciled });
    setFeedback({
      type: "success",
      message: reconciled ? "Marked transaction as reconciled." : "Transaction set back to unreconciled.",
    });
  };

  const handleRequestReceipt = async (transaction: Doc<"transactions">) => {
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
    if (!categories) {
      return;
    }

    const suggestion = await convex.query(api.ai.suggestCategory, {
      description: transaction.description,
      amount: transaction.amount,
      categories: (categories as Doc<"categories">[]).map((category) => ({
        id: category._id,
        name: category.name,
        type: category.type,
      })),
    });

    if (suggestion?.categoryId) {
      await updateTransaction({
        transactionId: transaction._id,
        categoryId: suggestion.categoryId as Id<"categories">,
      });
      setFeedback({
        type: "success",
        message: `Categorised using AI suggestion (${suggestion.categoryId}).`,
      });
    } else {
      setFeedback({ type: "error", message: "No confident suggestion available yet." });
    }
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

  const editingDefaults = useMemo(() => {
    if (!editingTransaction) {
      return undefined;
    }

    return {
      date: editingTransaction.date,
      type: editingTransaction.type,
      description: editingTransaction.description,
      amount: editingTransaction.amount,
      fundId: editingTransaction.fundId as string,
      categoryId: editingTransaction.categoryId ?? "",
      donorId: editingTransaction.donorId ?? "",
      method: editingTransaction.method ?? "",
      reference: editingTransaction.reference ?? "",
      giftAid: editingTransaction.giftAid,
      notes: editingTransaction.notes ?? "",
      enteredByName: editingTransaction.enteredByName ?? "",
      receiptStorageId: editingTransaction.receiptStorageId ?? undefined,
      receiptFilename: editingTransaction.receiptFilename ?? undefined,
    } satisfies Partial<Omit<TransactionFormValues, "churchId">>;
  }, [editingTransaction]);
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
              <span>Bulk CSV uploads & AI mapping available in the import workspace</span>
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
          <div className="space-y-4">
            {editingTransaction ? (
              <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
                Editing {editingTransaction.description} · changes are tracked in the audit log
              </Badge>
            ) : null}
            <TransactionForm
              churchId={churchId}
              funds={funds as Doc<"funds">[]}
              categories={categories as Doc<"categories">[]}
              donors={donors as Doc<"donors">[]}
              defaultValues={editingDefaults}
              heading={editingTransaction ? "Edit transaction" : "Manual transaction entry"}
              subheading={
                editingTransaction
                  ? "Adjust ledger entries and we'll automatically log the amendment."
                  : "Capture one-off income or expenses with full audit detail."
              }
              submitLabel={editingTransaction ? "Update transaction" : "Record transaction"}
              showReceiptHint
              onSubmit={handleManualSubmit}
              onSubmitSuccess={() => {
                const mode = editingModeRef.current;
                setFeedback({
                  type: "success",
                  message:
                    mode === "edit"
                      ? "Transaction updated successfully."
                      : "Manual transaction recorded successfully.",
                });
                if (mode === "edit") {
                  setEditingTransaction(null);
                }
                editingModeRef.current = "create";
              }}
            />
          </div>
          <div className="space-y-6">
            <QuickDonationDialog
              churchId={churchId}
              funds={funds as Doc<"funds">[]}
              categories={categories as Doc<"categories">[]}
              donors={donors as Doc<"donors">[]}
              onCreate={handleQuickEntry}
            />
            <SundayCollectionCard
              churchId={churchId}
              funds={funds as Doc<"funds">[]}
              categories={incomeCategories as Doc<"categories">[]}
              onCreate={handleSundaySubmit}
              defaultFundId={funds[0]?._id}
            />
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink">CSV import workspace</CardTitle>
                <CardDescription className="text-grey-mid">
                  Drag and drop Barclays or HSBC exports, map the columns, and review duplicates before approving.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-grey-mid">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-grey-mid" />
                  Ready for iteration 4 bulk entry
                </div>
                <Button
                  variant="outline"
                  className="w-fit border-ledger font-primary"
                  asChild
                >
                  <a href="/imports">Open import workspace</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="rounded-lg border border-ledger bg-paper p-6 shadow-none">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Ledger activity</h2>
              <p className="text-sm text-grey-mid">
                Review and reconcile the most recent 200 transactions across your funds.
              </p>
            </div>
          </div>
          <TransactionLedger
            rows={(ledger ?? []) as TransactionLedgerRow[]}
            loading={!ledger}
            onEdit={(transaction) => {
              setEditingTransaction(transaction);
            }}
            onDelete={handleDelete}
            onToggleReconciled={handleToggleReconciled}
            onRequestReceipt={handleRequestReceipt}
            onSuggestCategory={handleSuggestCategory}
          />
        </div>
      </div>
    </div>
  );
}
