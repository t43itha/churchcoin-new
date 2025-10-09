"use client";

import { useMemo, useState } from "react";

import { FundForm, type FundFormValues } from "@/components/funds/fund-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Doc } from "@/lib/convexGenerated";

type FundSettingsTabProps = {
  fund: Doc<"funds">;
  onSubmit: (values: FundFormValues) => Promise<void> | void;
  isSubmitting: boolean;
  errorMessage: string | null;
};

export function FundSettingsTab({ fund, onSubmit, isSubmitting, errorMessage }: FundSettingsTabProps) {
  const [formKey, setFormKey] = useState(0);

  const initialValues = useMemo<FundFormValues>(
    () => ({
      name: fund.name,
      type: fund.type,
      description: fund.description ?? "",
      restrictions: fund.restrictions ?? "",
      isFundraising: fund.isFundraising ?? false,
      fundraisingTarget: fund.fundraisingTarget ?? undefined,
    }),
    [fund]
  );

  return (
    <div className="space-y-8">
      <Card className="border-ledger bg-paper">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wide text-grey-mid">Fund settings</CardTitle>
        </CardHeader>
        <CardContent>
          <FundForm
            key={formKey}
            onSubmit={onSubmit}
            onCancel={() => setFormKey((prev) => prev + 1)}
            initialValues={initialValues}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>

      <Card className="border-ledger bg-paper">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wide text-error">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-grey-mid">
          <p>Archiving or deleting a fund will remove it from active reporting views.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="font-primary" disabled>
              Archive fund (coming soon)
            </Button>
            <Button variant="destructive" className="font-primary" disabled>
              Delete fund (coming soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
