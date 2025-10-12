"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Plus, X } from "lucide-react";

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

// Collection type options
const COLLECTION_TYPES = [
  { value: "sunday-collection", label: "Sunday Collection" },
  { value: "midweek-donation", label: "Midweek Donation" },
  { value: "building-fund", label: "Building Fund" },
  { value: "mission-offering", label: "Mission Offering" },
  { value: "thanksgiving", label: "Thanksgiving" },
  { value: "tithe", label: "Tithe" },
  { value: "first-fruits", label: "First Fruits" },
  { value: "special-appeal", label: "Special Appeal" },
  { value: "other", label: "Other (Custom)" },
] as const;

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
  { value: "bank-transfer", label: "Bank Transfer" },
] as const;

const transactionRowSchema = z.object({
  id: z.string(),
  collectionType: z.string().min(1, "Select collection type"),
  customDescription: z.string().optional(),
  amount: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) || 0 : val)
    .pipe(z.number().positive("Amount must be greater than 0")),
  method: z.enum(["cash", "card", "cheque", "online", "bank-transfer"]),
  fundId: z.string().min(1, "Select a fund"),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (row) => {
    if (row.collectionType === "other") {
      return row.customDescription && row.customDescription.trim().length > 0;
    }
    return true;
  },
  {
    message: "Custom description required when 'Other' is selected",
    path: ["customDescription"],
  }
);

const bulkTransactionSchema = z.object({
  date: z.string().min(1, "Select a date"),
  enteredByName: z.string().optional(),
  rows: z.array(transactionRowSchema).min(1, "Add at least one transaction"),
});

export type BulkTransactionFormValues = z.infer<typeof bulkTransactionSchema>;
export type TransactionRow = z.infer<typeof transactionRowSchema>;

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

type BulkTransactionDialogProps = {
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

function generateRowId() {
  return `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function BulkTransactionDialog({
  open,
  onOpenChange,
  churchId,
  funds,
  categories,
  onSubmit,
}: BulkTransactionDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incomeCategories = useMemo(() => {
    return categories.filter((category) => category.type === "income");
  }, [categories]);

  const form = useForm<BulkTransactionFormValues>({
    resolver: zodResolver(bulkTransactionSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      enteredByName: "",
      rows: [
        {
          id: generateRowId(),
          collectionType: "",
          customDescription: "",
          amount: 0,
          method: "cash",
          fundId: funds[0]?._id ?? "",
          categoryId: "",
          notes: "",
        },
      ],
    },
  });

  const { control, register, handleSubmit, watch, reset, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "rows",
  });

  const rows = watch("rows");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        date: new Date().toISOString().slice(0, 10),
        enteredByName: "",
        rows: [
          {
            id: generateRowId(),
            collectionType: "",
            customDescription: "",
            amount: 0,
            method: "cash",
            fundId: funds[0]?._id ?? "",
            categoryId: "",
            notes: "",
          },
        ],
      });
      setError(null);
    }
  }, [open, funds, reset]);

  // Calculate real-time summaries
  const summary = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

    const byFund = rows.reduce((acc, row) => {
      if (!row.fundId || !row.amount) return acc;
      const fund = funds.find((f) => f._id === row.fundId);
      if (!fund) return acc;

      const existing = acc.find((item) => item.fundId === row.fundId);
      if (existing) {
        existing.amount += Number(row.amount);
      } else {
        acc.push({
          fundId: row.fundId,
          fundName: fund.name,
          amount: Number(row.amount),
        });
      }
      return acc;
    }, [] as { fundId: string; fundName: string; amount: number }[]);

    const byCategory = rows.reduce((acc, row) => {
      if (!row.categoryId || !row.amount) return acc;
      const category = categories.find((c) => c._id === row.categoryId);
      if (!category) return acc;

      const existing = acc.find((item) => item.categoryId === row.categoryId);
      if (existing) {
        existing.amount += Number(row.amount);
      } else {
        acc.push({
          categoryId: row.categoryId,
          categoryName: category.name,
          amount: Number(row.amount),
        });
      }
      return acc;
    }, [] as { categoryId: string; categoryName: string; amount: number }[]);

    const byMethod = rows.reduce((acc, row) => {
      if (!row.method || !row.amount) return acc;

      const existing = acc.find((item) => item.method === row.method);
      if (existing) {
        existing.amount += Number(row.amount);
      } else {
        acc.push({
          method: row.method,
          amount: Number(row.amount),
        });
      }
      return acc;
    }, [] as { method: string; amount: number }[]);

    return { total, byFund, byCategory, byMethod };
  }, [rows, funds, categories]);

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    append({
      id: generateRowId(),
      collectionType: "",
      customDescription: "",
      amount: 0,
      method: lastRow?.method ?? "cash",
      fundId: lastRow?.fundId ?? (funds[0]?._id ?? ""),
      categoryId: lastRow?.categoryId ?? "",
      notes: "",
    });
  };

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);

    try {
      const transactions: TransactionCreateValues[] = values.rows.map((row) => {
        // Determine description from collection type
        let description = "";
        if (row.collectionType === "other") {
          description = row.customDescription || "Other donation";
        } else {
          const collectionTypeOption = COLLECTION_TYPES.find(
            (opt) => opt.value === row.collectionType
          );
          description = collectionTypeOption?.label || row.collectionType;
        }

        return {
          churchId,
          date: values.date,
          description,
          amount: row.amount,
          type: "income",
          fundId: row.fundId as Id<"funds">,
          categoryId: row.categoryId ? (row.categoryId as Id<"categories">) : undefined,
          donorId: undefined,
          method: row.method,
          giftAid: false,
          notes: row.notes?.trim() || undefined,
          enteredByName: values.enteredByName?.trim() || undefined,
          source: "manual",
        };
      });

      await onSubmit(transactions);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save transactions");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] sm:max-w-[80vw] lg:max-w-[1100px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Entry</DialogTitle>
          <DialogDescription>
            Record single or multiple transactions in one session
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={submit}>
          {error ? (
            <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          ) : null}

          {/* Form-level fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium">Transaction date</Label>
              <Input
                id="date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                {...register("date")}
                className="h-11 md:h-10 text-base md:text-sm"
              />
              {errors.date ? (
                <p className="text-sm text-error">{errors.date.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="enteredByName" className="text-sm font-medium">Entered by (optional)</Label>
              <Input
                id="enteredByName"
                placeholder="e.g. Sarah Thompson"
                {...register("enteredByName")}
                className="h-11 md:h-10 text-base md:text-sm"
              />
            </div>
          </div>

          {/* Editable grid - Desktop Table View (hidden on mobile) */}
          <div className="space-y-3">
            <div className="hidden md:block rounded-lg border border-ledger bg-paper">
              <div className="overflow-x-auto">
                <table className="w-full font-primary">
                  <thead className="bg-ledger">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-grey-dark">
                        Collection Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-grey-dark">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-grey-dark">
                        Method
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-grey-dark">
                        Fund
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-grey-dark">
                        Category
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-grey-dark">

                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b border-ledger last:border-b-0">
                        <td className="px-3 py-2">
                          <select
                            {...register(`rows.${index}.collectionType`)}
                            className="h-8 w-full min-w-[150px] rounded-md border border-ledger bg-paper px-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                          >
                            <option value="">Select...</option>
                            {COLLECTION_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          {rows[index]?.collectionType === "other" && (
                            <Input
                              {...register(`rows.${index}.customDescription`)}
                              placeholder="Enter description"
                              className="mt-1 h-8 text-xs"
                            />
                          )}
                          {errors.rows?.[index]?.collectionType ? (
                            <p className="mt-1 text-xs text-error">
                              {errors.rows[index]?.collectionType?.message}
                            </p>
                          ) : null}
                          {errors.rows?.[index]?.customDescription ? (
                            <p className="mt-1 text-xs text-error">
                              {errors.rows[index]?.customDescription?.message}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`rows.${index}.amount`)}
                            className="h-8 w-24 text-xs"
                          />
                          {errors.rows?.[index]?.amount ? (
                            <p className="mt-1 text-xs text-error">
                              {errors.rows[index]?.amount?.message}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            {...register(`rows.${index}.method`)}
                            className="h-8 w-full min-w-[100px] rounded-md border border-ledger bg-paper px-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                          >
                            {METHOD_OPTIONS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            {...register(`rows.${index}.fundId`)}
                            className="h-8 w-full min-w-[120px] rounded-md border border-ledger bg-paper px-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                          >
                            <option value="">Select...</option>
                            {funds.map((fund) => (
                              <option key={fund._id} value={fund._id}>
                                {fund.name}
                              </option>
                            ))}
                          </select>
                          {errors.rows?.[index]?.fundId ? (
                            <p className="mt-1 text-xs text-error">
                              {errors.rows[index]?.fundId?.message}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            {...register(`rows.${index}.categoryId`)}
                            className="h-8 w-full min-w-[120px] rounded-md border border-ledger bg-paper px-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                          >
                            <option value="">None</option>
                            {incomeCategories.map((category) => (
                              <option key={category._id} value={category._id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            className="h-7 w-7 p-0 text-error hover:bg-error/10 hover:text-error"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove row</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (visible only on mobile) */}
            <div className="md:hidden space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border-2 border-ledger bg-paper p-5 space-y-4 shadow-sm">
                  {/* Card Header with Row Number and Delete */}
                  <div className="flex items-center justify-between pb-2 border-b border-ledger">
                    <span className="text-sm font-semibold text-ink">
                      Transaction {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="h-9 px-3 text-error hover:bg-error/10 hover:text-error"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>

                  {/* Collection Type */}
                  <div className="space-y-2">
                    <Label htmlFor={`mobile-collectionType-${index}`} className="text-sm font-medium">
                      Collection Type
                    </Label>
                    <select
                      id={`mobile-collectionType-${index}`}
                      {...register(`rows.${index}.collectionType`)}
                      className="h-11 w-full rounded-md border border-ledger bg-paper px-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                    >
                      <option value="">Select...</option>
                      {COLLECTION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {rows[index]?.collectionType === "other" && (
                      <Input
                        {...register(`rows.${index}.customDescription`)}
                        placeholder="Enter description"
                        className="h-11 text-base"
                      />
                    )}
                    {errors.rows?.[index]?.collectionType ? (
                      <p className="text-sm text-error">
                        {errors.rows[index]?.collectionType?.message}
                      </p>
                    ) : null}
                    {errors.rows?.[index]?.customDescription ? (
                      <p className="text-sm text-error">
                        {errors.rows[index]?.customDescription?.message}
                      </p>
                    ) : null}
                  </div>

                  {/* Amount and Method in a grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`mobile-amount-${index}`} className="text-sm font-medium">
                        Amount (£)
                      </Label>
                      <Input
                        id={`mobile-amount-${index}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        {...register(`rows.${index}.amount`)}
                        className="h-11 text-base"
                      />
                      {errors.rows?.[index]?.amount ? (
                        <p className="text-sm text-error">
                          {errors.rows[index]?.amount?.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`mobile-method-${index}`} className="text-sm font-medium">
                        Method
                      </Label>
                      <select
                        id={`mobile-method-${index}`}
                        {...register(`rows.${index}.method`)}
                        className="h-11 w-full rounded-md border border-ledger bg-paper px-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                      >
                        {METHOD_OPTIONS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fund */}
                  <div className="space-y-2">
                    <Label htmlFor={`mobile-fundId-${index}`} className="text-sm font-medium">
                      Fund
                    </Label>
                    <select
                      id={`mobile-fundId-${index}`}
                      {...register(`rows.${index}.fundId`)}
                      className="h-11 w-full rounded-md border border-ledger bg-paper px-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                    >
                      <option value="">Select...</option>
                      {funds.map((fund) => (
                        <option key={fund._id} value={fund._id}>
                          {fund.name}
                        </option>
                      ))}
                    </select>
                    {errors.rows?.[index]?.fundId ? (
                      <p className="text-sm text-error">
                        {errors.rows[index]?.fundId?.message}
                      </p>
                    ) : null}
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor={`mobile-categoryId-${index}`} className="text-sm font-medium">
                      Category (Optional)
                    </Label>
                    <select
                      id={`mobile-categoryId-${index}`}
                      {...register(`rows.${index}.categoryId`)}
                      className="h-11 w-full rounded-md border border-ledger bg-paper px-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                    >
                      <option value="">None</option>
                      {incomeCategories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              className="font-primary w-full md:w-auto h-11 md:h-9"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>

            {errors.rows && typeof errors.rows.message === "string" ? (
              <p className="text-sm text-error">{errors.rows.message}</p>
            ) : null}
          </div>

          {/* Summary panel */}
          <div className="rounded-lg border border-ledger bg-highlight/30 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-ink">Summary</h3>

            <div className="flex items-center justify-between border-b border-ledger pb-2">
              <span className="text-sm font-medium text-ink">Total</span>
              <Badge variant="outline" className="border-ledger text-ink text-base">
                {currency.format(summary.total)}
              </Badge>
            </div>

            {summary.byFund.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-grey-mid">By Fund</p>
                <div className="space-y-1">
                  {summary.byFund.map((item) => (
                    <div key={item.fundId} className="flex items-center justify-between text-xs">
                      <span className="text-grey-mid">{item.fundName}</span>
                      <span className="font-medium text-ink">{currency.format(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.byCategory.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-grey-mid">By Category</p>
                <div className="space-y-1">
                  {summary.byCategory.map((item) => (
                    <div key={item.categoryId} className="flex items-center justify-between text-xs">
                      <span className="text-grey-mid">{item.categoryName}</span>
                      <span className="font-medium text-ink">{currency.format(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.byMethod.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-grey-mid">By Method</p>
                <div className="space-y-1">
                  {summary.byMethod.map((item) => (
                    <div key={item.method} className="flex items-center justify-between text-xs">
                      <span className="text-grey-mid capitalize">{item.method}</span>
                      <span className="font-medium text-ink">{currency.format(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-ledger pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="w-full sm:w-auto h-11 md:h-10"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto h-11 md:h-10">
              {submitting ? "Saving..." : `Record ${fields.length} Transaction${fields.length > 1 ? "s" : ""}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
