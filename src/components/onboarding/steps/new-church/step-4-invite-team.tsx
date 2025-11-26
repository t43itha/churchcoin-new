"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { X, Plus, Mail } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "../../onboarding-provider";
import { useSession } from "@/components/auth/session-provider";
import { api } from "@/lib/convexGenerated";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["administrator", "finance", "pastorate", "secured_guest"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

type PendingInvite = {
  email: string;
  role: string;
  status: "pending" | "sent" | "error";
};

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  finance: "Finance",
  pastorate: "Pastorate",
  secured_guest: "Guest",
};

export function Step4InviteTeam() {
  const { data, goToNextStep, goToPreviousStep, canGoBack } = useOnboarding();
  const { user } = useSession();
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isSending, setIsSending] = useState(false);

  const createInvitation = useMutation(api.auth.createInvitation);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "finance",
    },
  });

  const addInvite = (values: InviteFormValues) => {
    // Check for duplicates
    if (pendingInvites.some((inv) => inv.email === values.email)) {
      form.setError("email", {
        type: "manual",
        message: "This email is already in the list",
      });
      return;
    }

    setPendingInvites((prev) => [
      ...prev,
      { email: values.email, role: values.role, status: "pending" },
    ]);

    form.reset({ email: "", role: "finance" });
  };

  const removeInvite = (email: string) => {
    setPendingInvites((prev) => prev.filter((inv) => inv.email !== email));
  };

  const sendInvites = async () => {
    if (!data.churchId || !user?._id || pendingInvites.length === 0) {
      goToNextStep();
      return;
    }

    setIsSending(true);

    for (const invite of pendingInvites) {
      try {
        await createInvitation({
          email: invite.email,
          role: invite.role as "administrator" | "finance" | "pastorate" | "secured_guest",
          churchId: data.churchId,
          invitedBy: user._id,
        });

        setPendingInvites((prev) =>
          prev.map((inv) =>
            inv.email === invite.email ? { ...inv, status: "sent" } : inv
          )
        );
      } catch (error) {
        console.error(`Failed to send invite to ${invite.email}:`, error);
        setPendingInvites((prev) =>
          prev.map((inv) =>
            inv.email === invite.email ? { ...inv, status: "error" } : inv
          )
        );
      }
    }

    setIsSending(false);
    goToNextStep();
  };

  const handleSkip = () => {
    goToNextStep();
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ink mb-2 font-primary">
          Invite your team
        </h1>
        <p className="text-grey-mid font-primary">
          Add people who will help manage church finances. You can always invite
          more later.
        </p>
      </div>

      {/* Add invite form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(addInvite)}
          className="space-y-4 mb-6"
        >
          <div className="flex gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="colleague@example.com"
                      className="font-primary"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="w-36">
                  <FormLabel className="sr-only">Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="font-primary">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="administrator">Admin</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="pastorate">Pastorate</SelectItem>
                      <SelectItem value="secured_guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <Button type="submit" size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>

      {/* Pending invites list */}
      {pendingInvites.length > 0 && (
        <div className="border border-ledger rounded-lg divide-y divide-ledger mb-8">
          {pendingInvites.map((invite) => (
            <div
              key={invite.email}
              className="flex items-center justify-between p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="h-4 w-4 text-grey-mid shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-primary text-ink truncate">
                    {invite.email}
                  </p>
                  <p className="text-xs text-grey-mid font-primary">
                    {ROLE_LABELS[invite.role]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {invite.status === "sent" && (
                  <Badge variant="outline" className="bg-success/10 text-success">
                    Sent
                  </Badge>
                )}
                {invite.status === "error" && (
                  <Badge variant="outline" className="bg-error/10 text-error">
                    Error
                  </Badge>
                )}
                {invite.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInvite(invite.email)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {pendingInvites.length === 0 && (
        <div className="border border-dashed border-ledger rounded-lg p-8 mb-8 text-center">
          <Mail className="h-8 w-8 text-grey-mid mx-auto mb-2" />
          <p className="text-sm text-grey-mid font-primary">
            No invitations added yet
          </p>
        </div>
      )}

      <div className="flex justify-between">
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
            onClick={sendInvites}
            className="font-primary"
            disabled={isSending}
          >
            {isSending
              ? "Sending..."
              : pendingInvites.length > 0
                ? `Send ${pendingInvites.length} invite${pendingInvites.length > 1 ? "s" : ""}`
                : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
