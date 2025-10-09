"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FundSupporter } from "./types";

const editPledgeSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  pledgedAt: z.string().min(1, "Pledge date is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["open", "fulfilled", "cancelled"]),
});

export type EditPledgeFormValues = z.infer<typeof editPledgeSchema>;

type FundPledgeEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supporter: FundSupporter | null;
  onSubmit: (values: EditPledgeFormValues) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string | null;
};

export function FundPledgeEditDialog({
  open,
  onOpenChange,
  supporter,
  onSubmit,
  isSubmitting,
  errorMessage,
}: FundPledgeEditDialogProps) {
  const form = useForm<EditPledgeFormValues>({
    resolver: zodResolver(editPledgeSchema),
    values: supporter
      ? {
          amount: supporter.amountPledged,
          pledgedAt: supporter.pledgedAt,
          dueDate: supporter.dueDate || "",
          notes: supporter.notes || "",
          status: supporter.status,
        }
      : undefined,
  });

  const handleSubmit = async (values: EditPledgeFormValues) => {
    await onSubmit(values);
    if (!errorMessage) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-ledger bg-paper font-primary">
        <DialogHeader>
          <DialogTitle className="text-xl text-ink">
            Edit pledge {supporter ? `for ${supporter.donorName}` : ""}
          </DialogTitle>
          <DialogDescription className="text-grey-mid">
            Update pledge details and status.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-ink">Amount (£)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      className="border-ledger bg-paper font-primary"
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
                    <FormLabel className="text-ink">Pledged date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="border-ledger bg-paper font-primary"
                      />
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
                    <FormLabel className="text-ink">Due date (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="border-ledger bg-paper font-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-ink">Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-ledger bg-paper font-primary">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="border-ledger bg-paper font-primary">
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="fulfilled">Fulfilled</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-ink">Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      className="border-ledger bg-paper font-primary"
                      placeholder="Additional notes or comments..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMessage && (
              <div className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error">
                {errorMessage}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="border-ledger font-primary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-ink font-primary text-paper hover:bg-grey-dark"
              >
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
