"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Doc, Id } from "@/lib/convexGenerated";

const manualEntrySchema = z.object({
  date: z.string().min(1, "Select a date"),
  collectionType: z.enum(["sunday-collection", "midweek", "other"]),
  cash: z.coerce.number().min(0, "Cannot be negative"),
  pdq: z.coerce.number().min(0, "Cannot be negative"),
  cheque: z.coerce.number().min(0, "Cannot be negative"),
  online: z.coerce.number().min(0, "Cannot be negative"),
  fundId: z.string().min(1, "Select a fund"),
  categoryId: z.string().optional(),
  donorId: z.string().optional(),
  giftAid: z.boolean().default(false),
  notes: z.string().optional(),
  enteredByName: z.string().optional(),
}).refine(
  (values) => values.cash > 0 || values.pdq > 0 || values.cheque > 0 || values.online > 0,
  {
    message: "Enter at least one amount",
    path: ["cash"],
  }
);

export type ManualEntryFormValues = z.infer<typeof manualEntrySchema>;

export type TransactionCreateValues = {
  churchId: Id<"churches">;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  fundId: Id<"funds">;
  categoryId?: Id<"categories">;
  donorId?: Id<"donors">;
  method: string;
  giftAid: boolean;
  notes?: string;
  enteredByName?: string;
  source: "manual";
};

type ManualTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchId: Id<"churches">;
  funds: Doc<"funds">[];
  categories: Doc<"categories">[];
  donors: Doc<"donors">[];
  onSubmit: (transactions: TransactionCreateValues[]) => Promise<void>;
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

export function ManualTransactionDialog({
  open,
  onOpenChange,
  churchId,
  funds,
  categories,
  donors,
  onSubmit,
}: ManualTransactionDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incomeCategories = useMemo(() => {
    return categories.filter((category) => category.type === "income");
  }, [categories]);

  const form = useForm({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      collectionType: "sunday-collection" as const,
      cash: 0,
      pdq: 0,
      cheque: 0,
      online: 0,
      fundId: funds[0]?._id ?? "",
      categoryId: "",
      donorId: "",
      giftAid: false,
      notes: "",
      enteredByName: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        date: new Date().toISOString().slice(0, 10),
        collectionType: "sunday-collection" as const,
        cash: 0,
        pdq: 0,
        cheque: 0,
        online: 0,
        fundId: funds[0]?._id ?? "",
        categoryId: "",
        donorId: "",
        giftAid: false,
        notes: "",
        enteredByName: "",
      });
    }
  }, [form, funds, open]);

  const {
    handleSubmit,
    register,
    watch,
    formState: { errors },
  } = form;

  const cash = Number(watch("cash")) || 0;
  const pdq = Number(watch("pdq")) || 0;
  const cheque = Number(watch("cheque")) || 0;
  const online = Number(watch("online")) || 0;
  const collectionType = watch("collectionType");

  const total = cash + pdq + cheque + online;

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);

    try {
      const transactions: TransactionCreateValues[] = [];
      const baseDescription = 
        collectionType === "sunday-collection" 
          ? "Sunday collection"
          : collectionType === "midweek"
          ? "Midweek donation"
          : "Manual entry";

      if (values.cash > 0) {
        transactions.push({
          churchId,
          date: values.date,
          description: `${baseDescription} – cash`,
          amount: values.cash,
          type: "income",
          fundId: values.fundId as Id<"funds">,
          categoryId: values.categoryId ? (values.categoryId as Id<"categories">) : undefined,
          donorId: values.donorId ? (values.donorId as Id<"donors">) : undefined,
          method: "cash",
          giftAid: values.giftAid,
          notes: values.notes?.trim() || undefined,
          enteredByName: values.enteredByName?.trim() || undefined,
          source: "manual",
        });
      }

      if (values.pdq > 0) {
        transactions.push({
          churchId,
          date: values.date,
          description: `${baseDescription} – PDQ/card`,
          amount: values.pdq,
          type: "income",
          fundId: values.fundId as Id<"funds">,
          categoryId: values.categoryId ? (values.categoryId as Id<"categories">) : undefined,
          donorId: values.donorId ? (values.donorId as Id<"donors">) : undefined,
          method: "card",
          giftAid: false,
          notes: values.notes?.trim() || undefined,
          enteredByName: values.enteredByName?.trim() || undefined,
          source: "manual",
        });
      }

      if (values.cheque > 0) {
        transactions.push({
          churchId,
          date: values.date,
          description: `${baseDescription} – cheque`,
          amount: values.cheque,
          type: "income",
          fundId: values.fundId as Id<"funds">,
          categoryId: values.categoryId ? (values.categoryId as Id<"categories">) : undefined,
          donorId: values.donorId ? (values.donorId as Id<"donors">) : undefined,
          method: "cheque",
          giftAid: values.giftAid,
          notes: values.notes?.trim() || undefined,
          enteredByName: values.enteredByName?.trim() || undefined,
          source: "manual",
        });
      }

      if (values.online > 0) {
        transactions.push({
          churchId,
          date: values.date,
          description: `${baseDescription} – online/Stripe`,
          amount: values.online,
          type: "income",
          fundId: values.fundId as Id<"funds">,
          categoryId: values.categoryId ? (values.categoryId as Id<"categories">) : undefined,
          donorId: values.donorId ? (values.donorId as Id<"donors">) : undefined,
          method: "online",
          giftAid: false,
          notes: values.notes?.trim() || undefined,
          enteredByName: values.enteredByName?.trim() || undefined,
          source: "manual",
        });
      }

      await onSubmit(transactions);
      form.reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save transaction");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manual transaction entry</DialogTitle>
          <DialogDescription>
            Record in-person donations with cash, card, cheque, or online splits.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          {error ? (
            <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          ) : null}
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Transaction date</Label>
              <Input
                id="date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                {...register("date")}
              />
              {errors.date ? (
                <p className="text-sm text-error">{errors.date.message}</p>
              ) : null}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="collectionType">Collection type</Label>
              <select
                id="collectionType"
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                {...register("collectionType")}
              >
                <option value="sunday-collection">Sunday Collection</option>
                <option value="midweek">Midweek Donation</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-ledger bg-highlight/30 p-4">
            <p className="text-sm font-medium text-ink">Amount split by method</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cash">Cash</Label>
                <Input
                  id="cash"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("cash")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pdq">PDQ/Card</Label>
                <Input
                  id="pdq"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("pdq")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cheque">Cheques</Label>
                <Input
                  id="cheque"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("cheque")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="online">Online/Stripe</Label>
                <Input
                  id="online"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("online")}
                />
              </div>
            </div>
            {errors.cash ? (
              <p className="text-sm text-error">{errors.cash.message}</p>
            ) : null}
            <div className="flex items-center justify-between rounded-md border border-ledger bg-paper px-3 py-2">
              <span className="text-sm font-medium text-ink">Total</span>
              <Badge variant="outline" className="border-ledger text-ink">
                {currency.format(total)}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category (optional)</Label>
              <select
                id="categoryId"
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                {...register("categoryId")}
              >
                <option value="">No category</option>
                {incomeCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donorId">Donor (optional)</Label>
            <select
              id="donorId"
              className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              {...register("donorId")}
            >
              <option value="">Anonymous</option>
              {donors.map((donor) => (
                <option key={donor._id} value={donor._id}>
                  {donor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ledger accent-ink"
                {...register("giftAid")}
              />
              Gift Aid eligible donation
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              rows={3}
              className="w-full rounded-md border border-ledger bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              placeholder="Add any contextual details"
              {...register("notes")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="enteredByName">Entered by (optional)</Label>
            <Input
              id="enteredByName"
              placeholder="e.g. Sarah Thompson"
              {...register("enteredByName")}
            />
            <p className="text-xs text-grey-mid">
              Used to attribute manual entries when user accounts are unavailable.
            </p>
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
              {submitting ? "Saving..." : "Record transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
