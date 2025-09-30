"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const pledgeSchema = z.object({
  donorId: z.string().min(1, "Select a donor"),
  amount: z.coerce.number().positive("Enter a pledge amount"),
  pledgedAt: z.string().min(1, "Select pledge date"),
  dueDate: z.string().optional(),
  notes: z
    .string()
    .max(320, "Keep notes brief")
    .optional()
    .or(z.literal("")),
});

export type FundPledgeFormValues = { donorId: string; amount: number; pledgedAt: string; dueDate?: string; notes?: string; };

type DonorOption = {
  id: string;
  name: string;
};

type FundPledgeFormProps = {
  donors: DonorOption[];
  onSubmit: (values: FundPledgeFormValues) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

export function FundPledgeForm({
  donors,
  onSubmit,
  onCancel,
  isSubmitting,
  errorMessage,
}: FundPledgeFormProps) {
  const form = useForm<FundPledgeFormValues>({
    resolver: zodResolver(pledgeSchema) as unknown as import("react-hook-form").Resolver<FundPledgeFormValues>,
    defaultValues: {
      donorId: donors[0]?.id ?? "",
      amount: undefined,
      pledgedAt: new Date().toISOString().slice(0, 10),
      dueDate: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (donors.length > 0 && !form.getValues("donorId")) {
      form.setValue("donorId", donors[0].id);
    }
  }, [donors, form]);

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        {errorMessage ? (
          <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {errorMessage}
          </div>
        ) : null}
        <FormField
          control={form.control}
          name="donorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Donor</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={donors.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="font-primary">
                    <SelectValue placeholder="Select donor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="font-primary">
                  {donors.length === 0 ? (
                    <SelectItem value="" disabled>
                      No active donors available
                    </SelectItem>
                  ) : null}
                  {donors.map((donor) => (
                    <SelectItem key={donor.id} value={donor.id}>
                      {donor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pledge amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={field.value ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    field.onChange(value === "" ? undefined : Number(value));
                  }}
                  placeholder="e.g. 5000"
                  className="font-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="pledgedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pledge date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="font-primary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      field.onChange(value === "" ? undefined : value);
                    }}
                    className="font-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={3}
                  className="w-full rounded-md border border-ledger bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                  placeholder="Add any pledge context"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-end gap-2 border-t border-ledger pt-4">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              className="font-primary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            className="font-primary"
            disabled={isSubmitting || donors.length === 0}
          >
            {isSubmitting ? "Saving..." : "Save pledge"}
          </Button>
        </div>
      </form>
    </Form>
  );
}






