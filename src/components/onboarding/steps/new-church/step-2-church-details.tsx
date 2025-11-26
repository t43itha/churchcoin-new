"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOnboarding } from "../../onboarding-provider";
import { api } from "@/lib/convexGenerated";

const churchDetailsSchema = z.object({
  charityNumber: z
    .string()
    .max(20, "Charity number must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "Address must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

type ChurchDetailsFormValues = z.infer<typeof churchDetailsSchema>;

export function Step2ChurchDetails() {
  const { data, updateData, goToNextStep, goToPreviousStep, canGoBack } =
    useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateChurch = useMutation(api.onboarding.updateChurchDuringOnboarding);

  const form = useForm<ChurchDetailsFormValues>({
    resolver: zodResolver(churchDetailsSchema),
    defaultValues: {
      charityNumber: data.charityNumber || "",
      address: data.address || "",
    },
  });

  const onSubmit = async (values: ChurchDetailsFormValues) => {
    if (!data.churchId) {
      goToPreviousStep();
      return;
    }

    setIsSubmitting(true);
    try {
      // Update church with details if provided
      if (values.charityNumber || values.address) {
        await updateChurch({
          churchId: data.churchId,
          charityNumber: values.charityNumber || undefined,
          address: values.address || undefined,
        });
      }

      updateData({
        charityNumber: values.charityNumber || "",
        address: values.address || "",
      });

      goToNextStep();
    } catch (error) {
      console.error("Failed to update church:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    goToNextStep();
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ink mb-2 font-primary">
          Add some details
        </h1>
        <p className="text-grey-mid font-primary">
          These help with Gift Aid claims and compliance. You can skip this for
          now.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="charityNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-primary">
                  Charity registration number
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 1234567"
                    className="font-primary"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="font-primary text-xs">
                  Your UK charity commission number (if registered)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-primary">Church address</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="123 Church Street&#10;London&#10;SW1A 1AA"
                    className="font-primary resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription className="font-primary text-xs">
                  Used for official correspondence and reports
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={goToPreviousStep}
              disabled={!canGoBack}
              className="font-primary"
            >
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                className="font-primary"
              >
                Skip
              </Button>
              <Button
                type="submit"
                className="font-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Continue"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
