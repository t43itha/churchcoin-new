"use client";

import { useEffect, useMemo, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { Banknote, LineChart, NotebookPen, PlusCircle } from "lucide-react";

import {
  ManualTransactionDialog,
  type TransactionCreateValues,
} from "@/components/transactions/manual-transaction-dialog";
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog";
import {
  TransactionLedger,
  type TransactionLedgerRow,
} from "@/components/transactions/transaction-ledger";
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
import { api, type Doc, type Id } from "@/lib/convexGenerated";
import { useSession } from "@/components/auth/session-provider";
import { getRolePermissions } from "@/lib/rbac";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

export default function TransactionsPage() {
  const convex = useConvex();
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Doc<"transactions"> | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { user } = useSession();
  const permissions = useMemo(
    () => getRolePermissions(user?.role),
    [user?.role]
  );
  const canManageTransactions = permissions.canManageFinancialData;
  const canRecordManualTransactions = permissions.canRecordManualTransactions;
  const canViewFinancialData = permissions.canViewFinancialData;
  const showLedger = canViewFinancialData && !permissions.restrictedToManualEntry;

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
    churchId ? { churchId, limit: 1000 } : "skip"
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
    fundId?: Id<"funds">;
    categoryId?: Id<"categories">;
    donorId?: Id<"donors">;
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


  const totals = useMemo(() => {
    if (!ledger) {
      return { income: 0, expense: 0, count: 0, unreconciled: 0 };
    }

    return ledger.reduce(
      (acc, row) => {
        acc.count += 1;
        if (row.transaction.type === "income") {
          acc.income += row.transaction.amount;
        } else {
          acc.expense += row.transaction.amount;
        }
        if (!row.transaction.reconciled) {
          acc.unreconciled += 1;
        }
        return acc;
      },
      { income: 0, expense: 0, count: 0, unreconciled: 0 }
    );
  }, [ledger]);


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
                <span className="text-sm uppercase tracking-wide">Transaction Management</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Transactions</h1>
              <p className="text-sm text-grey-mid">
                Record in-person donations and manage your transaction ledger with powerful search and filters.
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
              {canRecordManualTransactions ? (
                <Button
                  className="font-primary"
                  onClick={() => {
                    setEditingTransaction(null);
                    setIsDialogOpen(true);
                  }}
                  disabled={!churchId}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New transaction
                </Button>
              ) : null}
            </div>
          </div>
          {canViewFinancialData ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-ledger">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                    <Banknote className="h-4 w-4 text-grey-mid" />
                    Total income
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-success">
                  +{currency.format(totals.income)}
                </CardContent>
              </Card>
              <Card className="border-ledger">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                    <LineChart className="h-4 w-4 text-grey-mid" />
                    Total expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-error">
                  -{currency.format(totals.expense)}
                </CardContent>
              </Card>
              <Card className="border-ledger">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                    <NotebookPen className="h-4 w-4 text-grey-mid" />
                    Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-ink">
                  {totals.count}
                </CardContent>
              </Card>
              <Card className="border-ledger">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                    <Banknote className="h-4 w-4 text-grey-mid" />
                    Unreconciled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-ink">{totals.unreconciled}</div>
                  <p className="text-xs text-grey-mid">Need bank matching</p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-10">
        {!churchId ? (
          <div className="rounded-lg border border-dashed border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            Add a church to Convex and select it to begin tracking transactions.
          </div>
        ) : null}
        {!showLedger && canRecordManualTransactions ? (
          <div className="rounded-lg border border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            You can record transactions using the manual entry form. Financial ledgers are hidden for this access level.
          </div>
        ) : null}
        {churchId && showLedger && ledger === undefined ? (
          <div className="rounded-lg border border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            Loading transactions…
          </div>
        ) : null}
        {churchId && showLedger && ledger ? (
          <div className="space-y-6">
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
            
            <div className="rounded-lg border border-ledger bg-paper p-6 shadow-none">
              <div className="mb-6 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-ink">Transaction ledger</h2>
                  <p className="text-sm text-grey-mid">
                    Search, filter, and manage all transactions. Click edit to update details or reconcile when matched to bank statements.
                  </p>
                </div>
              </div>
              <TransactionLedger
                rows={(ledger ?? []) as TransactionLedgerRow[]}
                loading={!ledger}
                onEdit={canManageTransactions ? (transaction) => {
                  setEditingTransaction(transaction);
                  setIsEditDialogOpen(true);
                } : undefined}
                onDelete={canManageTransactions ? handleDelete : undefined}
                onToggleReconciled={canManageTransactions ? handleToggleReconciled : undefined}
                onRequestReceipt={canViewFinancialData ? handleRequestReceipt : undefined}
                onSuggestCategory={canManageTransactions ? handleSuggestCategory : undefined}
              />
            </div>
          </div>
        ) : null}
      </div>

      {canRecordManualTransactions && churchId && funds && categories && donors ? (
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

          {canManageTransactions && editingTransaction ? (
            <EditTransactionDialog
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              transaction={editingTransaction}
              funds={funds as Doc<"funds">[]}
              categories={categories as Doc<"categories">[]}
              donors={donors as Doc<"donors">[]}
              onSubmit={handleQuickUpdateTransaction}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
