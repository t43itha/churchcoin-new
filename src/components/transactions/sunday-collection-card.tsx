"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Doc, Id } from "@/lib/convexGenerated";

import type { TransactionFormValues } from "./transaction-form";

const sundaySchema = z
  .object({
    churchId: z.string().min(1, "Select a church"),
    date: z.string().min(1, "Select a service date"),
    fundId: z.string().min(1, "Choose a fund"),
    looseCash: z.coerce.number().min(0, "Amount cannot be negative"),
    envelopes: z.coerce.number().min(0, "Amount cannot be negative"),
    cardOnline: z.coerce.number().min(0, "Amount cannot be negative"),
    giftAidEnvelopes: z.boolean().default(true),
    reference: z.string().optional(),
    notes: z.string().optional(),
    enteredByName: z.string().optional(),
  })
  .refine(
    (values) => values.looseCash > 0 || values.envelopes > 0 || values.cardOnline > 0,
    {
      message: "Enter at least one amount to record",
      path: ["looseCash"],
    }
  );

type SundayCollectionFormValues = z.infer<typeof sundaySchema>;

type SundayCollectionCardProps = {
  churchId: Id<"churches">;
  funds: Doc<"funds">[];
  categories: Doc<"categories">[];
  onCreate: (transactions: TransactionFormValues[]) => Promise<void>;
  defaultFundId?: Id<"funds">;
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

export function SundayCollectionCard({
  churchId,
  funds,
  categories,
  onCreate,
  defaultFundId,
}: SundayCollectionCardProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sundayCategory = useMemo(() => {
    return categories.find(
      (category) =>
        category.type === "income" &&
        category.name.toLowerCase() === "sunday collection"
    );
  }, [categories]);

  const form = useForm<SundayCollectionFormValues>({
    resolver: zodResolver(sundaySchema) as Resolver<SundayCollectionFormValues>,
    defaultValues: {
      churchId,
      date: new Date().toISOString().slice(0, 10),
      fundId: defaultFundId ?? funds[0]?._id ?? "",
      looseCash: 0,
      envelopes: 0,
      cardOnline: 0,
      giftAidEnvelopes: true,
      reference: "",
      notes: "",
      enteredByName: "",
    },
  });

  const {
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const looseCash = Number(watch("looseCash")) || 0;
  const envelopes = Number(watch("envelopes")) || 0;
  const cardOnline = Number(watch("cardOnline")) || 0;

  const total = looseCash + envelopes + cardOnline;

  const onSubmitHandler = handleSubmit(async (values) => {
    setSubmitError(null);

    const reference =
      values.reference && values.reference.trim().length > 0
        ? values.reference.trim()
        : undefined;
    const notes =
      values.notes && values.notes.trim().length > 0 ? values.notes.trim() : undefined;
    const countedBy =
      values.enteredByName && values.enteredByName.trim().length > 0
        ? values.enteredByName.trim()
        : undefined;

    try {
      const transactions: TransactionFormValues[] = [];

      if (values.looseCash > 0) {
        transactions.push({
          churchId,
          date: values.date,
          type: "income",
          description: "Sunday collection – loose cash",
          amount: values.looseCash,
          fundId: values.fundId,
          categoryId: sundayCategory?._id,
          donorId: undefined,
          method: "cash",
          reference,
          giftAid: false,
          notes,
          enteredByName: countedBy,
        });
      }

      if (values.envelopes > 0) {
        transactions.push({
          churchId,
          date: values.date,
          type: "income",
          description: "Sunday collection – envelopes",
          amount: values.envelopes,
          fundId: values.fundId,
          categoryId: sundayCategory?._id,
          donorId: undefined,
          method: "cash",
          reference,
          giftAid: values.giftAidEnvelopes,
          notes,
          enteredByName: countedBy,
        });
      }

      if (values.cardOnline > 0) {
        transactions.push({
          churchId,
          date: values.date,
          type: "income",
          description: "Sunday collection – card & online",
          amount: values.cardOnline,
          fundId: values.fundId,
          categoryId: sundayCategory?._id,
          donorId: undefined,
          method: "card",
          reference,
          giftAid: false,
          notes,
          enteredByName: countedBy,
        });
      }

      await onCreate(transactions);

      reset({
        churchId,
        date: values.date,
        fundId: values.fundId,
        looseCash: 0,
        envelopes: 0,
        cardOnline: 0,
        giftAidEnvelopes: values.giftAidEnvelopes,
        reference: reference ?? "",
        notes: notes ?? "",
        enteredByName: countedBy ?? "",
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to record Sunday collection"
      );
    }
  });

  return (
    <Card className="border-ledger bg-paper shadow-none">
      <CardHeader>
        <CardTitle className="text-ink">Sunday collection workflow</CardTitle>
        <CardDescription className="text-grey-mid">
          Quickly split loose cash, envelopes, and card gifts into individual ledger entries.
        </CardDescription>
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
              <label className="text-sm font-medium text-ink">Service date</label>
              <Input type="date" className="font-primary" {...register("date")} />
              {errors.date ? <p className="text-sm text-error">{errors.date.message}</p> : null}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Deposit to fund</label>
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
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Loose cash</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="font-primary"
                {...register("looseCash")}
              />
              {errors.looseCash ? (
                <p className="text-sm text-error">{errors.looseCash.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Gift Aid envelopes</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="font-primary"
                {...register("envelopes")}
              />
              {errors.envelopes ? (
                <p className="text-sm text-error">{errors.envelopes.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">Card & online</label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="font-primary"
                {...register("cardOnline")}
              />
              {errors.cardOnline ? (
                <p className="text-sm text-error">{errors.cardOnline.message}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink">Gift Aid envelopes eligible?</label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ledger accent-ink"
                {...register("giftAidEnvelopes")}
              />
              Treat envelope total as Gift Aid eligible
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink">Banking reference</label>
            <Input
              placeholder="e.g. Sunday 10am deposit"
              className="font-primary"
              {...register("reference")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink">Notes (optional)</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-ledger bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
              placeholder="Add split explanations or counting notes"
              {...register("notes")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink">Counted by</label>
            <Input
              placeholder="e.g. David & Priya"
              className="font-primary"
              {...register("enteredByName")}
            />
            <p className="text-xs text-grey-mid">
              Shown in the audit log alongside generated transactions.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-md border border-ledger bg-highlight px-4 py-3 text-sm text-ink">
            <div>
              <p className="font-semibold">Total to record</p>
              <p className="text-grey-mid">Generated as individual income entries.</p>
            </div>
            <div className="text-xl font-semibold">{currency.format(Number.isFinite(total) ? total : 0)}</div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-ledger pt-4">
            <Button type="submit" className="font-primary" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Sunday collection"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
