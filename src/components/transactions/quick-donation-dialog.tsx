"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { Doc, Id } from "@/lib/convexGenerated";

const quickEntrySchema = z.object({
  date: z.string().min(1),
  description: z.string().min(2),
  amount: z
    .number()
    .refine((value) => Number.isFinite(value), "Enter a valid amount")
    .gt(0, "Amount must be greater than zero"),
  fundId: z.string().min(1),
  categoryId: z.string().optional(),
  donorId: z.string().optional(),
  method: z.string().optional(),
  giftAid: z.boolean().optional(),
});

export type QuickEntryValues = z.infer<typeof quickEntrySchema>;

type QuickDonationDialogProps = {
  churchId: Id<"churches">;
  funds: Doc<"funds">[];
  categories: Doc<"categories">[];
  donors: Doc<"donors">[];
  onCreate: (values: QuickEntryValues) => Promise<void>;
};

export function QuickDonationDialog({
  churchId,
  funds,
  categories,
  donors,
  onCreate,
}: QuickDonationDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(true);

  const form = useForm<QuickEntryValues>({
    resolver: zodResolver(quickEntrySchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      description: "Midweek gift",
      amount: 0,
      fundId: funds[0]?._id ?? "",
      categoryId: categories.find((c) => c.type === "income")?._id ?? "",
      donorId: "",
      method: "",
      giftAid: false,
    },
  });

  useEffect(() => {
    form.reset({
      date: new Date().toISOString().slice(0, 10),
      description: "Midweek gift",
      amount: 0,
      fundId: funds[0]?._id ?? "",
      categoryId: categories.find((c) => c.type === "income")?._id ?? "",
      donorId: "",
      method: "",
      giftAid: false,
    });
  }, [churchId, categories, funds, form]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping = tagName === "input" || tagName === "textarea" || target?.isContentEditable;
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !isTyping) {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setHintVisible(false);
    }
  }, [open]);

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        ...values,
        donorId: values.donorId || undefined,
        categoryId: values.categoryId || undefined,
        method: values.method || undefined,
      });
      form.reset({
        date: new Date().toISOString().slice(0, 10),
        description: "Midweek gift",
        amount: 0,
        fundId: funds[0]?._id ?? "",
        categoryId: categories.find((c) => c.type === "income")?._id ?? "",
        donorId: "",
        method: "",
        giftAid: false,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create donation");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <>
      {hintVisible ? (
        <Badge
          variant="secondary"
          className="border-ledger bg-highlight text-ink"
        >
          Press <span className="font-semibold">/</span> for quick entry
        </Badge>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Midweek quick entry</DialogTitle>
            <DialogDescription>
              Capture a single income item without leaving the keyboard.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            {error ? (
              <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
            ) : null}
            <div className="grid gap-3">
              <Label htmlFor="quick-date">Date</Label>
              <Input id="quick-date" type="date" max={new Date().toISOString().slice(0, 10)} {...form.register("date")} />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="quick-description">Description</Label>
              <Input id="quick-description" placeholder="e.g. Tuesday prayer gift" {...form.register("description")} />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="quick-amount">Amount</Label>
              <Input
                id="quick-amount"
                type="number"
                step="0.01"
                min="0"
                {...form.register("amount", { valueAsNumber: true })}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="quick-fund">Fund</Label>
              <select
                id="quick-fund"
                className="h-9 rounded-md border border-ledger bg-paper px-3 text-sm text-ink"
                {...form.register("fundId")}
              >
                {funds.map((fund) => (
                  <option key={fund._id} value={fund._id}>
                    {fund.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="quick-category">Category</Label>
              <select
                id="quick-category"
                className="h-9 rounded-md border border-ledger bg-paper px-3 text-sm text-ink"
                {...form.register("categoryId")}
              >
                <option value="">No category</option>
                {categories
                  .filter((category) => category.type === "income")
                  .map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="quick-donor">Donor</Label>
              <select
                id="quick-donor"
                className="h-9 rounded-md border border-ledger bg-paper px-3 text-sm text-ink"
                {...form.register("donorId")}
              >
                <option value="">Anonymous</option>
                {donors.map((donor) => (
                  <option key={donor._id} value={donor._id}>
                    {donor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="quick-method">Method</Label>
              <Input id="quick-method" placeholder="cash / transfer" {...form.register("method")} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="h-4 w-4" {...form.register("giftAid")} />
              Gift Aid eligible donation
            </label>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving" : "Add donation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
