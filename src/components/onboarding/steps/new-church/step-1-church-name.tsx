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
import { useOnboarding } from "../../onboarding-provider";
import { api } from "@/lib/convexGenerated";

const churchNameSchema = z.object({
  name: z
    .string()
    .min(2, "Church name must be at least 2 characters")
    .max(100, "Church name must be less than 100 characters"),
});

type ChurchNameFormValues = z.infer<typeof churchNameSchema>;

export function Step1ChurchName() {
  const { data, updateData, goToNextStep } = useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createChurch = useMutation(api.onboarding.createChurchWithOnboarding);

  const form = useForm<ChurchNameFormValues>({
    resolver: zodResolver(churchNameSchema),
    defaultValues: {
      name: data.churchName || "",
    },
  });

  const onSubmit = async (values: ChurchNameFormValues) => {
    setIsSubmitting(true);
    try {
      // Create the church immediately with the name
      const churchId = await createChurch({
        name: values.name,
      });

      // Update local state
      updateData({
        churchName: values.name,
        churchId,
      });

      goToNextStep();
    } catch (error) {
      console.error("Failed to create church:", error);
      form.setError("name", {
        type: "manual",
        message: "Failed to create church. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ink mb-2 font-primary">
          What&apos;s your church called?
        </h1>
        <p className="text-grey-mid font-primary">
          This will be the name shown throughout ChurchCoin.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-primary">Church name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. St Mary's Parish Church"
                    className="font-primary"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormDescription className="font-primary text-xs">
                  You can change this later in settings.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full font-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Continue"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
