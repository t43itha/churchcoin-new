"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@/lib/convexGenerated";
import { api } from "@/lib/convexGenerated";

const donorFormSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .email("Invalid email format")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .regex(/^$|^(\+44|0)[0-9]{10}$/u, "Invalid UK phone number")
      .optional()
      .or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    bankReference: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
    giftAidSigned: z.boolean(),
    giftAidDate: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => !data.giftAidSigned || Boolean(data.giftAidDate && data.giftAidDate.length > 0),
    {
      message: "Date required when Gift Aid is signed",
      path: ["giftAidDate"],
    },
  );

type DonorFormValues = z.infer<typeof donorFormSchema>;

type DonorFormDialogProps = {
  donor?: Doc<"donors"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchId: Id<"churches"> | null;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

const defaultValues: DonorFormValues = {
  name: "",
  email: "",
  phone: "",
  address: "",
  bankReference: "",
  notes: "",
  giftAidSigned: false,
  giftAidDate: "",
};

export function DonorFormDialog({ donor, open, onOpenChange, churchId }: DonorFormDialogProps) {
  const form = useForm<DonorFormValues>({
    resolver: zodResolver(donorFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const createDonor = useMutation(api.donors.createDonor);
  const updateDonor = useMutation(api.donors.updateDonor);

  const isEditMode = Boolean(donor);

  const donorDefaults = useMemo<DonorFormValues>(() => {
    if (!donor) {
      return defaultValues;
    }
    return {
      name: donor.name,
      email: donor.email ?? "",
      phone: donor.phone ?? "",
      address: donor.address ?? "",
      bankReference: donor.bankReference ?? "",
      notes: donor.notes ?? "",
      giftAidSigned: Boolean(donor.giftAidDeclaration?.signed),
      giftAidDate: donor.giftAidDeclaration?.date ?? "",
    };
  }, [donor]);

  useEffect(() => {
    if (open) {
      form.reset(donorDefaults);
      setFeedback(null);
    }
  }, [donorDefaults, open, form]);

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && form.formState.isDirty && !isSubmitting) {
      const shouldClose = window.confirm("Discard unsaved donor changes?");
      if (!shouldClose) {
        return;
      }
    }
    onOpenChange(nextOpen);
    if (!nextOpen) {
      form.reset(donorDefaults);
      setFeedback(null);
    }
  };

  const onSubmit = (values: DonorFormValues) => {
    const isGiftAidSigned = Boolean(values.giftAidSigned);
    if (!churchId && !donor) {
      setFeedback({ type: "error", message: "Select a church before adding donors." });
      return;
    }

    setSubmitting(true);
    (async () => {
      try {
        const payload = {
          name: values.name,
          email: values.email?.trim() ? values.email.trim() : undefined,
          phone: values.phone?.trim() ? values.phone.trim() : undefined,
          address: values.address?.trim() ? values.address.trim() : undefined,
          bankReference: values.bankReference?.trim()
            ? values.bankReference.trim()
            : undefined,
          notes: values.notes?.trim() ? values.notes.trim() : undefined,
          giftAidDeclaration: isGiftAidSigned
            ? {
                signed: true,
                date: values.giftAidDate ?? new Date().toISOString().slice(0, 10),
              }
            : undefined,
        } as const;

        if (donor) {
          await updateDonor({
            donorId: donor._id,
            ...payload,
          });
          setFeedback({ type: "success", message: "Donor details updated." });
        } else if (churchId) {
          await createDonor({
            churchId,
            ...payload,
          });
          setFeedback({ type: "success", message: "New donor created." });
        }

        form.reset(defaultValues);
        onOpenChange(false);
      } catch (error) {
        console.error(error);
        setFeedback({ type: "error", message: "Unable to save donor. Please try again." });
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const watchGiftAid = Boolean(form.watch("giftAidSigned"));

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-ledger bg-paper font-primary sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">
            {isEditMode ? "Edit donor" : "New donor"}
          </DialogTitle>
          <DialogDescription className="text-sm text-grey-mid">
            {isEditMode
              ? "Update donor contact information, notes, and Gift Aid declaration."
              : "Capture donor information to begin tracking giving and Gift Aid."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Jane Doe" className="font-mono" disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="donor@example.com"
                          className="font-mono"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="07123 456789"
                          className="font-mono"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="123 High Street\nTown\nPostcode"
                        className="font-mono"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank reference</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Standing order reference"
                        className="font-mono"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Private notes about this donor"
                        className="font-mono"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border border-ledger bg-highlight/40 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Gift Aid declaration</p>
                  <p className="text-xs text-grey-mid">
                    Track signed declarations to include donations in HMRC claims.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="giftAidSigned"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center gap-2 text-sm">
                      <FormControl>
                        <Checkbox
                          checked={Boolean(field.value)}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormLabel className="text-xs uppercase tracking-wide text-grey-mid">
                        Signed
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              {watchGiftAid ? (
                <FormField
                  control={form.control}
                  name="giftAidDate"
                  render={({ field }) => (
                    <FormItem className="mt-3">
                      <FormLabel>Declaration date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="font-mono"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>

            {feedback ? (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                  feedback.type === "success"
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-error/40 bg-error/10 text-error",
                )}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{feedback.message}</span>
              </div>
            ) : null}

            <DialogFooter className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="border-ledger"
                onClick={() => handleDialogChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="border-ledger bg-ink text-paper hover:bg-ink/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : isEditMode ? "Save changes" : "Create donor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
