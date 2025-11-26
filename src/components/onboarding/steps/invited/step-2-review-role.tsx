"use client";

import { Shield, Eye, Settings, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "../../onboarding-provider";

const ROLE_INFO: Record<
  string,
  {
    title: string;
    description: string;
    icon: typeof Shield;
    permissions: string[];
  }
> = {
  administrator: {
    title: "Administrator",
    description: "Full access to all features and settings",
    icon: Settings,
    permissions: [
      "Manage all funds and transactions",
      "Invite and manage team members",
      "Access all reports and exports",
      "Configure church settings",
    ],
  },
  finance: {
    title: "Finance",
    description: "Manage day-to-day financial operations",
    icon: Shield,
    permissions: [
      "Create and edit transactions",
      "Manage funds and categories",
      "Run financial reports",
      "Cannot manage users or settings",
    ],
  },
  pastorate: {
    title: "Pastorate",
    description: "View financial information and reports",
    icon: Eye,
    permissions: [
      "View all funds and transactions",
      "Access financial reports",
      "Cannot create or edit data",
      "Cannot manage settings",
    ],
  },
  secured_guest: {
    title: "Guest",
    description: "Limited view access",
    icon: UserCheck,
    permissions: [
      "View basic fund summaries",
      "Limited report access",
      "Cannot see sensitive data",
      "Read-only access",
    ],
  },
};

export function Step2ReviewRole() {
  const { data, goToNextStep, goToPreviousStep, canGoBack } = useOnboarding();

  const roleKey = data.assignedRole ?? "finance";
  const roleInfo = ROLE_INFO[roleKey] ?? ROLE_INFO.finance;
  const Icon = roleInfo.icon;

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ink mb-2 font-primary">
          Your role &amp; permissions
        </h1>
        <p className="text-grey-mid font-primary">
          Here&apos;s what you&apos;ll be able to do in ChurchCoin.
        </p>
      </div>

      <Card className="p-6 border-ledger mb-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-highlight flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-ink" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-ink font-primary">
                {roleInfo.title}
              </h3>
              <Badge
                variant="outline"
                className="bg-highlight text-ink border-ledger font-primary"
              >
                Your role
              </Badge>
            </div>
            <p className="text-sm text-grey-mid font-primary">
              {roleInfo.description}
            </p>
          </div>
        </div>

        <div className="border-t border-ledger pt-4">
          <h4 className="text-sm font-medium text-ink font-primary mb-3">
            What you can do:
          </h4>
          <ul className="space-y-2">
            {roleInfo.permissions.map((permission, index) => (
              <li
                key={index}
                className="text-sm text-grey-mid font-primary flex items-start gap-2"
              >
                <span className="text-success mt-0.5">•</span>
                {permission}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <p className="text-xs text-grey-mid font-primary text-center mb-8">
        If you need different permissions, contact your church administrator.
      </p>

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
        <Button onClick={goToNextStep} className="font-primary">
          Continue
        </Button>
      </div>
    </div>
  );
}
