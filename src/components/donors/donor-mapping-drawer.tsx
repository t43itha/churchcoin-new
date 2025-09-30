"use client";

import { useMemo } from "react";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type DonorMappingConfig = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  bankReference?: string;
  giftAidSigned?: string;
  giftAidDate?: string;
  notes?: string;
};

type DonorMappingDrawerProps = {
  headers: string[];
  mapping: DonorMappingConfig;
  onChange: (mapping: DonorMappingConfig) => void;
  onConfirm: () => void;
};

export function DonorMappingDrawer({ headers, mapping, onChange, onConfirm }: DonorMappingDrawerProps) {
  const options = useMemo(() => headers.map((header) => ({ value: header, label: header })), [headers]);

  const renderSelect = (
    label: string,
    value: string | undefined,
    key: keyof DonorMappingConfig,
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

  return (
    <Card className="border-ledger bg-paper shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ink">
          <Settings2 className="h-4 w-4" /> Map donor fields
        </CardTitle>
        <CardDescription className="text-grey-mid">
          Match your CSV columns to donor fields. Only Name is required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {renderSelect("Name (required)", mapping.name, "name")}
          {renderSelect("Email", mapping.email ?? "", "email", true)}
          {renderSelect("Phone", mapping.phone ?? "", "phone", true)}
          {renderSelect("Address", mapping.address ?? "", "address", true)}
          {renderSelect("Bank Reference", mapping.bankReference ?? "", "bankReference", true)}
          {renderSelect("Gift Aid Signed", mapping.giftAidSigned ?? "", "giftAidSigned", true)}
          {renderSelect("Gift Aid Date", mapping.giftAidDate ?? "", "giftAidDate", true)}
          {renderSelect("Notes", mapping.notes ?? "", "notes", true)}
        </div>
        <Button 
          className="w-full border-ledger bg-ink text-paper" 
          onClick={onConfirm}
          disabled={!mapping.name}
        >
          Preview donors
        </Button>
      </CardContent>
    </Card>
  );
}
