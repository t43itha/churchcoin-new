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
import { formatUkDateNumeric } from "@/lib/dates";

const editSchema = z.object({
  categoryId: z.string().optional(),
  donorId: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

type EditTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Doc<"transactions"> | null;
  fund: Doc<"funds"> | null;
  categories: Doc<"categories">[];
  donors: Doc<"donors">[];
  onSubmit: (values: { categoryId?: Id<"categories">; donorId?: Id<"donors"> }) => Promise<void>;
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
  fund,
  categories,
  donors,
  onSubmit,
}: EditTransactionDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(editSchema),
    values: {
      categoryId: transaction?.categoryId ?? "",
      donorId: transaction?.donorId ?? "",
    },
  });

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = form;

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        categoryId: values.categoryId ? (values.categoryId as Id<"categories">) : undefined,
        donorId: values.donorId ? (values.donorId as Id<"donors">) : undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update transaction");
    } finally {
      setSubmitting(false);
    }
  });

  if (!transaction) return null;

  const isImported = transaction.source === "csv" || transaction.source === "api";
  const sourceLabel = 
    transaction.source === "csv" ? "CSV import" :
    transaction.source === "api" ? "API import" :
    "Manual entry";

  const filteredCategories = categories.filter(c => c.type === transaction.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>
            {isImported 
              ? "Assign category and donor. Imported transaction details cannot be modified."
              : "Update transaction details. Changes are tracked in the audit log."}
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs text-grey-mid">Date</span>
                <p className="font-medium text-ink">{formatUkDateNumeric(transaction.date)}</p>
              </div>
              <div>
                <span className="text-xs text-grey-mid">Amount</span>
                <p className={`font-medium font-mono ${transaction.type === "income" ? "text-success" : "text-error"}`}>
                  {transaction.type === "expense" ? "-" : ""}
                  {currency.format(transaction.amount)}
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs text-grey-mid">Description</span>
              <p className="font-medium text-ink">{transaction.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs text-grey-mid">Fund</span>
                <p className="text-ink">{fund?.name ?? "—"}</p>
              </div>
              {transaction.method ? (
                <div>
                  <span className="text-xs text-grey-mid">Method</span>
                  <p className="text-ink">{transaction.method.toUpperCase()}</p>
                </div>
              ) : null}
            </div>

            {transaction.reference ? (
              <div>
                <span className="text-xs text-grey-mid">Reference</span>
                <p className="text-ink">{transaction.reference}</p>
              </div>
            ) : null}
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
