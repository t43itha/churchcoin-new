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

const fundSchema = z.object({
  name: z.string().min(2, "Fund name must be at least 2 characters"),
  type: z.enum(["general", "restricted", "designated"]),
  description: z
    .string()
    .max(280, "Keep the description under 280 characters")
    .optional()
    .or(z.literal("")),
  restrictions: z
    .string()
    .max(320, "Keep restrictions concise")
    .optional()
    .or(z.literal("")),
  isFundraising: z.boolean(),
  fundraisingTarget: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }
      const numeric = typeof value === "string" ? Number(value) : value;
      return Number.isFinite(numeric) ? Number(numeric) : value;
    }, z.number().positive("Enter a fundraising target greater than zero"))
    .optional(),
});

export type FundFormValues = z.infer<typeof fundSchema>;

type FundFormProps = {
  onSubmit: (values: FundFormValues) => Promise<void> | void;
  onCancel?: () => void;
  initialValues?: Partial<FundFormValues>;
  isSubmitting?: boolean;
  submitLabel?: string;
  errorMessage?: string | null;
};

export function FundForm({
  onSubmit,
  onCancel,
  initialValues,
  isSubmitting,
  submitLabel = "Save Fund",
  errorMessage,
}: FundFormProps) {
  const form = useForm<FundFormValues>({
    resolver: zodResolver(fundSchema),
    defaultValues: {
      name: "",
      type: "general",
      description: "",
      restrictions: "",
      isFundraising: false,
      fundraisingTarget: undefined,
    },
  });

  const isFundraising = form.watch("isFundraising");

  useEffect(() => {
    if (!isFundraising) {
      form.setValue("fundraisingTarget", undefined, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [isFundraising, form]);

  useEffect(() => {
    if (initialValues) {
      form.reset({
        name: initialValues.name ?? "",
        type: initialValues.type ?? "general",
        description: initialValues.description ?? "",
        restrictions: initialValues.restrictions ?? "",
        isFundraising: initialValues.isFundraising ?? false,
        fundraisingTarget:
          initialValues.isFundraising && initialValues.fundraisingTarget !== undefined
            ? initialValues.fundraisingTarget
            : undefined,
      });
    }
  }, [initialValues, form]);

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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fund name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Mission Fund"
                  {...field}
                  className="font-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fund type</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="font-primary">
                    <SelectValue placeholder="Select fund type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="font-primary">
                  <SelectItem value="general">General (unrestricted)</SelectItem>
                  <SelectItem value="restricted">Restricted (donor restricted)</SelectItem>
                  <SelectItem value="designated">Designated (trustee set aside)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isFundraising"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <FormLabel>Fundraising fund</FormLabel>
                  <p className="text-sm text-grey-mid">
                    Enable pledge tracking, donor insights, and fundraising targets.
                  </p>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    className="h-4 w-4 rounded border-ledger text-ink focus:ring-2 focus:ring-grey-mid"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {isFundraising ? (
          <FormField
            control={form.control}
            name="fundraisingTarget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fundraising target (optional)</FormLabel>
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
                    placeholder="e.g. 25000"
                    className="font-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={3}
                  className="w-full rounded-md border border-ledger bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                  placeholder="What is this fund used for?"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="restrictions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Restrictions (optional)</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={3}
                  className="w-full rounded-md border border-ledger bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
                  placeholder="Note any donor or trustee restrictions"
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
          <Button type="submit" className="font-primary" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
