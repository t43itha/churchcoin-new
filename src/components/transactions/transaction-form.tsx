"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, type Doc, type Id } from "@/lib/convexGenerated";

const transactionSchema = z.object({
  churchId: z.string().min(1, "Select a church"),
  date: z.string().min(1, "Select a transaction date"),
  type: z.enum(["income", "expense"]),
  description: z
    .string()
    .min(3, "Description must be at least 3 characters")
    .max(140, "Keep descriptions concise"),
  amount: z.coerce.number().gt(0, "Amount must be greater than zero"),
  fundId: z.string().min(1, "Choose a fund"),
  categoryId: z.string().optional(),
  donorId: z.string().optional(),
  method: z.string().optional(),
  reference: z.string().optional(),
  giftAid: z.boolean().default(false),
  notes: z.string().optional(),
  enteredByName: z.string().optional(),
  receiptStorageId: z.string().optional(),
  receiptFilename: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

type TransactionFormProps = {
  churchId: Id<"churches">;
  funds: Doc<"funds">[];
  categories: Doc<"categories">[];
  donors: Doc<"donors">[];
  defaultValues?: Partial<Omit<TransactionFormValues, "churchId">>;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onSubmitSuccess?: () => void;
  heading?: string;
  subheading?: string;
  submitLabel?: string;
  showReceiptHint?: boolean;
};

const methodOptions = [
  { value: "", label: "No method" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank-transfer", label: "Bank transfer" },
  { value: "card", label: "Card reader" },
  { value: "online", label: "Online" },
];

export function TransactionForm({
  churchId,
  funds,
  categories,
  donors,
  defaultValues,
  onSubmit,
  onSubmitSuccess,
  heading = "Manual transaction entry",
  subheading = "Capture one-off income or expenses with full audit detail.",
  submitLabel = "Record transaction",
  showReceiptHint = true,
}: TransactionFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const generateUploadUrl = useMutation(api.files.generateReceiptUploadUrl);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as Resolver<TransactionFormValues>,
    defaultValues: {
      churchId,
      date: new Date().toISOString().slice(0, 10),
      type: "income",
      description: "",
      amount: 0,
      fundId: funds[0]?._id ?? "",
      categoryId: "",
      donorId: "",
      method: "cash",
      reference: "",
      giftAid: false,
      notes: "",
      enteredByName: "",
      receiptStorageId: defaultValues?.receiptStorageId,
      receiptFilename: defaultValues?.receiptFilename,
      ...defaultValues,
    },
  });

  useEffect(() => {
    form.reset({
      churchId,
      date: defaultValues?.date ?? new Date().toISOString().slice(0, 10),
      type: defaultValues?.type ?? "income",
      description: defaultValues?.description ?? "",
      amount: defaultValues?.amount ?? 0,
      fundId: defaultValues?.fundId ?? (funds[0]?._id ?? ""),
      categoryId: defaultValues?.categoryId ?? "",
      donorId: defaultValues?.donorId ?? "",
      method: defaultValues?.method ?? "cash",
      reference: defaultValues?.reference ?? "",
      giftAid: defaultValues?.giftAid ?? false,
      notes: defaultValues?.notes ?? "",
      enteredByName: defaultValues?.enteredByName ?? "",
      receiptStorageId: defaultValues?.receiptStorageId,
      receiptFilename: defaultValues?.receiptFilename,
    });
  }, [churchId, defaultValues, form, funds]);

  const {
    handleSubmit,
    register,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const selectedFundId = watch("fundId");
  const type = watch("type");

  const selectedFund = useMemo(() => {
    return funds.find((fund) => fund._id === selectedFundId) ?? null;
  }, [funds, selectedFundId]);

  const expenseCategories = useMemo(() => {
    return categories.filter((category) => category.type === "expense");
  }, [categories]);

  const incomeCategories = useMemo(() => {
    return categories.filter((category) => category.type === "income");
  }, [categories]);
  const onSubmitHandler = handleSubmit(async (values) => {
    setSubmitError(null);

    const sanitized: TransactionFormValues = {
      ...values,
      categoryId: values.categoryId && values.categoryId.length > 0 ? values.categoryId : undefined,
      donorId: values.donorId && values.donorId.length > 0 ? values.donorId : undefined,
      method: values.method && values.method.length > 0 ? values.method : undefined,
      reference: values.reference && values.reference.trim().length > 0 ? values.reference.trim() : undefined,
      notes: values.notes && values.notes.trim().length > 0 ? values.notes.trim() : undefined,
      enteredByName:
        values.enteredByName && values.enteredByName.trim().length > 0
          ? values.enteredByName.trim()
          : undefined,
      receiptStorageId: values.receiptStorageId,
      receiptFilename: values.receiptFilename,
    };

    try {
      if (receiptFile) {
        const uploadUrl = await generateUploadUrl({});
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": receiptFile.type,
          },
          body: receiptFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload receipt");
        }

        const { storageId } = (await uploadResponse.json()) as { storageId: string };
        sanitized.receiptStorageId = storageId;
        sanitized.receiptFilename = receiptFile.name;
      }
      await onSubmit(sanitized);
      reset({
        churchId,
        date: new Date().toISOString().slice(0, 10),
        type: sanitized.type,
        description: "",
        amount: 0,
        fundId: sanitized.fundId,
        categoryId: "",
        donorId: "",
        method: sanitized.method ?? "cash",
        reference: "",
        giftAid: false,
        notes: "",
        enteredByName: sanitized.enteredByName ?? "",
        receiptStorageId: undefined,
        receiptFilename: undefined,
      });
      setReceiptFile(null);
      onSubmitSuccess?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to record transaction");
    }
  });

  return (
    <Card className="border-ledger bg-paper shadow-none">
      <CardHeader>
        <CardTitle className="text-ink">{heading}</CardTitle>
        <CardDescription className="text-grey-mid">{subheading}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmitHandler}>
          {submitError ? (
            <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
              {submitError}
            </div>
          ) : null}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Transaction date</label>
              <Input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                className="font-primary"
                {...register("date")}
              />
              {errors.date ? (
                <p className="text-sm text-error">{errors.date.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Type</label>
              <select
                {...register("type")}
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              {errors.type ? <p className="text-sm text-error">{errors.type.message}</p> : null}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink">Description</label>
            <Input
              placeholder="e.g. Sunday service collection"
              className="font-primary"
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-error">{errors.description.message}</p>
            ) : null}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Fund</label>
              <select
                {...register("fundId")}
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
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
              {errors.fundId ? <p className="text-sm text-error">{errors.fundId.message}</p> : null}
              <p className="text-xs text-grey-mid">
                Balance: {selectedFund ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(selectedFund.balance) : "—"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Amount</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="font-primary"
                {...register("amount")}
              />
              {errors.amount ? <p className="text-sm text-error">{errors.amount.message}</p> : null}
              <p className="text-xs text-grey-mid">Always enter positive amounts.</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Category</label>
              <select
                {...register("categoryId")}
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              >
                <option value="">No category</option>
                {(type === "expense" ? expenseCategories : incomeCategories).map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Donor (optional)</label>
              <select
                {...register("donorId")}
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              >
                <option value="">No donor</option>
                {donors.map((donor) => (
                  <option key={donor._id} value={donor._id}>
                    {donor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Method</label>
              <select
                {...register("method")}
                className="h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              >
                {methodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Reference</label>
              <Input
                placeholder="e.g. HSBC REF 1234"
                className="font-primary"
                {...register("reference")}
              />
            </div>
          </div>
          {type === "income" ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Gift Aid eligible?</label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-ledger accent-ink"
                  {...register("giftAid")}
                />
                Gift Aid declaration recorded for this donation
              </label>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink">Notes (optional)</label>
            <textarea
              rows={4}
              className="w-full rounded-md border border-ledger bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              placeholder="Add any contextual details or split explanations"
              {...register("notes")}
            />
          </div>
          {type === "expense" ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Receipt attachment</label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setReceiptFile(file);
                  if (file) {
                    setValue("receiptFilename", file.name);
                    setValue("receiptStorageId", undefined);
                  } else {
                    setValue("receiptFilename", undefined);
                    setValue("receiptStorageId", undefined);
                  }
                }}
              />
              {form.watch("receiptFilename") ? (
                <div className="flex items-center gap-2 text-xs text-grey-mid">
                  <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
                    {form.watch("receiptFilename")}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-error"
                    onClick={() => {
                      setReceiptFile(null);
                      setValue("receiptFilename", undefined);
                      setValue("receiptStorageId", undefined);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
              {showReceiptHint ? (
                <p className="text-xs text-grey-mid">
                  Upload PDFs or images. Receipts live alongside the ledger entry for audits.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink">Entered by</label>
            <Input
              placeholder="e.g. Sarah Thompson"
              className="font-primary"
              {...register("enteredByName")}
            />
            <p className="text-xs text-grey-mid">
              Used to attribute manual entries when user accounts are unavailable.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-ledger pt-4">
            <Button type="submit" className="font-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
