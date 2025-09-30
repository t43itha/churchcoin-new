"use client";

import { useMemo } from "react";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type PledgeMappingConfig = {
  donorName: string;
  donorEmail?: string;
  amount: string;
  pledgedDate: string;
  dueDate?: string;
  notes?: string;
};

type PledgeMappingDrawerProps = {
  headers: string[];
  mapping: PledgeMappingConfig;
  onChange: (mapping: PledgeMappingConfig) => void;
  onConfirm: () => void;
};

export function PledgeMappingDrawer({ 
  headers, 
  mapping, 
  onChange, 
  onConfirm 
}: PledgeMappingDrawerProps) {
  const options = useMemo(() => headers.map((header) => ({ value: header, label: header })), [headers]);

  const renderSelect = (
    label: string,
    value: string | undefined,
    key: keyof PledgeMappingConfig,
    allowEmpty = false
  ) => {
    return (
      <label className="flex flex-col gap-1 text-sm text-ink">
        {label}
        <select
          value={value ?? ""}
          onChange={(event) =>
            onChange({
              ...mapping,
              [key]: allowEmpty && event.target.value === "" ? undefined : event.target.value,
            })
          }
          className="h-9 rounded-md border border-ledger bg-paper px-3 text-sm text-ink"
        >
          {allowEmpty ? <option value="">Ignore</option> : <option value="" disabled>Select column</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  };

  const isValid = mapping.donorName && mapping.amount && mapping.pledgedDate;

  return (
    <Card className="border-ledger bg-paper shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ink">
          <Settings2 className="h-4 w-4" /> Map pledge fields
        </CardTitle>
        <CardDescription className="text-grey-mid">
          Match your CSV columns to pledge fields. Donor Name, Amount, and Pledged Date are required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {renderSelect("Donor Name (required)", mapping.donorName, "donorName")}
          {renderSelect("Donor Email (helps matching)", mapping.donorEmail ?? "", "donorEmail", true)}
          {renderSelect("Amount (required)", mapping.amount, "amount")}
          {renderSelect("Pledged Date (required)", mapping.pledgedDate, "pledgedDate")}
          {renderSelect("Due Date", mapping.dueDate ?? "", "dueDate", true)}
          {renderSelect("Notes", mapping.notes ?? "", "notes", true)}
        </div>
        <Button 
          className="w-full border-ledger bg-ink text-paper" 
          onClick={onConfirm}
          disabled={!isValid}
        >
          Preview pledges
        </Button>
      </CardContent>
    </Card>
  );
}
