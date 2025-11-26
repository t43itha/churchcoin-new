"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "../../onboarding-provider";

const DEFAULT_FUNDS = [
  {
    name: "General Fund",
    type: "general" as const,
    description: "General church fund for unrestricted donations",
  },
  {
    name: "Building Fund",
    type: "restricted" as const,
    description:
      "Restricted fund for building maintenance and improvements",
  },
];

const TYPE_STYLES = {
  general: { label: "General", className: "bg-highlight text-ink border-ledger" },
  restricted: { label: "Restricted", className: "bg-error/10 text-error border-error/20" },
  designated: { label: "Designated", className: "bg-success/10 text-success border-success/20" },
};

export function Step3ReviewFunds() {
  const { updateData, goToNextStep, goToPreviousStep, canGoBack } =
    useOnboarding();

  const handleContinue = () => {
    updateData({ reviewedFunds: true });
    goToNextStep();
  };

  const handleSkip = () => {
    goToNextStep();
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ink mb-2 font-primary">
          We&apos;ve set up these funds for you
        </h1>
        <p className="text-grey-mid font-primary">
          These are standard funds for UK churches. You can add, edit, or remove
          funds later in the dashboard.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {DEFAULT_FUNDS.map((fund) => (
          <Card key={fund.name} className="p-4 border-ledger bg-paper">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-ink font-primary">
                  {fund.name}
                </h3>
                <p className="text-sm text-grey-mid font-primary mt-1">
                  {fund.description}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`${TYPE_STYLES[fund.type].className} font-primary shrink-0`}
              >
                {TYPE_STYLES[fund.type].label}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="bg-highlight/50 border border-ledger rounded-lg p-4 mb-8">
        <p className="text-sm text-grey-mid font-primary">
          <strong className="text-ink">Tip:</strong> General funds can be used
          for any purpose. Restricted funds must be spent according to their
          specified restrictions (e.g., building repairs only).
        </p>
      </div>

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
          <Button onClick={handleContinue} className="font-primary">
            Looks good
          </Button>
        </div>
      </div>
    </div>
  );
}
