"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Doc, Id } from "@/lib/convexGenerated";

const editSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["income", "expense"]),
  fundId: z.string().min(1, "Fund is required"),
  categoryId: z.string().optional(),
  donorId: z.string().optional(),
  method: z.string().optional(),
  reference: z.string().optional(),
  giftAid: z.boolean().optional(),
  notes: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

type EditTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Doc<"transactions"> | null;
  funds: Doc<"funds">[];
  categories: Doc<"categories">[];
  donors: Doc<"donors">[];
  onSubmit: (values: {
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
  }) => Promise<void>;
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  funds,
  categories,
  donors,
  onSubmit,
}: EditTransactionDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: {
      date: transaction?.date ?? "",
      description: transaction?.description ?? "",
      amount: transaction?.amount ?? 0,
      type: transaction?.type ?? "income",
      fundId: transaction?.fundId ?? "",
      categoryId: transaction?.categoryId ?? "",
      donorId: transaction?.donorId ?? "",
      method: transaction?.method ?? "",
      reference: transaction?.reference ?? "",
      giftAid: transaction?.giftAid ?? false,
      notes: transaction?.notes ?? "",
    },
  });

  const {
    handleSubmit,
    register,
    watch,
    formState: { errors },
  } = form;

  const selectedFundId = watch("fundId");
  const selectedFund = funds.find((f) => f._id === selectedFundId);
  const selectedType = watch("type");

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        date: values.date,
        description: values.description,
        amount: values.amount,
        type: values.type,
        fundId: values.fundId as Id<"funds">,
        categoryId: values.categoryId ? (values.categoryId as Id<"categories">) : undefined,
        donorId: values.donorId ? (values.donorId as Id<"donors">) : undefined,
        method: values.method || undefined,
        reference: values.reference || undefined,
        giftAid: values.giftAid,
        notes: values.notes || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update transaction");
    } finally {
      setSubmitting(false);
    }
  });

  if (!transaction) return null;

  const sourceLabel =
    transaction.source === "csv" ? "CSV import" :
    transaction.source === "api" ? "API import" :
    "Manual entry";

  const filteredCategories = categories.filter(c => c.type === selectedType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>
            Update all transaction details.
          </DialogDescription>
        </DialogHeader>
        
        <form className="space-y-4" onSubmit={submit}>
          {error ? (
            <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          ) : null}

          <div className="space-y-4 rounded-lg border border-ledger bg-highlight/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-grey-mid">Source</span>
              <Badge variant="outline" className="border-ledger text-ink">
                {sourceLabel}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <input
                type="date"
                id="date"
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                {...register("date")}
              />
              {errors.date ? (
                <p className="text-sm text-error">{errors.date.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                {...register("type")}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              {errors.type ? (
                <p className="text-sm text-error">{errors.type.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <input
              type="text"
              id="description"
              className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-error">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <input
              type="number"
              step="0.01"
              min="0"
              id="amount"
              className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount ? (
              <p className="text-sm text-error">{errors.amount.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <input
                type="text"
                id="method"
                placeholder="e.g., Cash, Bank Transfer"
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                {...register("method")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <input
                type="text"
                id="reference"
                placeholder="Optional reference"
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                {...register("reference")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fundId">Fund</Label>
            <select
              id="fundId"
              className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              {...register("fundId")}
            >
              <option value="" disabled>
                Select fund
              </option>
              {funds.map((fund) => (
                <option key={fund._id} value={fund._id}>
                  {fund.name}
                </option>
              ))}
            </select>
            {errors.fundId ? (
              <p className="text-sm text-error">{errors.fundId.message}</p>
            ) : null}
            <p className="text-xs text-grey-mid">
              Balance: {selectedFund ? currency.format(selectedFund.balance) : "—"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <select
              id="categoryId"
              className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              {...register("categoryId")}
            >
              <option value="">No category</option>
              {filteredCategories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId ? (
              <p className="text-sm text-error">{errors.categoryId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="donorId">Donor (optional)</Label>
            <select
              id="donorId"
              className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              {...register("donorId")}
            >
              <option value="">No donor</option>
              {donors.map((donor) => (
                <option key={donor._id} value={donor._id}>
                  {donor.name}
                </option>
              ))}
            </select>
            {errors.donorId ? (
              <p className="text-sm text-error">{errors.donorId.message}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="giftAid"
              className="h-4 w-4 rounded border-ledger text-ink focus:ring-2 focus:ring-grey-mid"
              {...register("giftAid")}
            />
            <Label htmlFor="giftAid" className="cursor-pointer">
              Gift Aid eligible
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Additional notes..."
              className="w-full rounded-md border border-ledger bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              {...register("notes")}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-ledger pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
