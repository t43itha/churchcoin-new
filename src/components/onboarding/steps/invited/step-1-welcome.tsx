"use client";

import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOnboarding } from "../../onboarding-provider";

export function Step1Welcome() {
  const { data, goToNextStep } = useOnboarding();

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink mb-2 font-primary">
          Welcome to ChurchCoin
        </h1>
        <p className="text-grey-mid font-primary">
          You&apos;ve been invited to help manage church finances.
        </p>
      </div>

      <Card className="p-6 border-ledger bg-highlight/30 mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-paper border border-ledger flex items-center justify-center">
            <Building2 className="h-6 w-6 text-ink" />
          </div>
        </div>
        <p className="text-sm text-grey-mid font-primary mb-1">
          You&apos;re joining:
        </p>
        <p className="text-xl font-semibold text-ink font-primary">
          {data.churchToJoin?.name ?? "Your Church"}
        </p>
      </Card>

      <p className="text-sm text-grey-mid font-primary mb-8">
        ChurchCoin helps small UK churches manage their finances with ease.
        Track donations, manage funds, and stay compliant with charity
        regulations.
      </p>

      <Button className="w-full font-primary" size="lg" onClick={goToNextStep}>
        Continue
      </Button>
    </div>
  );
}
