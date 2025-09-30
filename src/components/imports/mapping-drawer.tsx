"use client";

import { useMemo } from "react";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type MappingConfig = {
  date: string;
  description: string;
  amount: string;
  amountIn?: string;
  amountOut?: string;
  reference?: string;
  type?: string;
};

type MappingDrawerProps = {
  headers: string[];
  mapping: MappingConfig;
  onChange: (mapping: MappingConfig) => void;
  onConfirm: () => void;
};

export function MappingDrawer({ headers, mapping, onChange, onConfirm }: MappingDrawerProps) {
  const options = useMemo(() => headers.map((header) => ({ value: header, label: header })), [headers]);

  const renderSelect = (
    label: string,
    value: string | undefined,
    key: keyof MappingConfig,
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
          {allowEmpty ? <option value="">Ignore</option> : null}
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
          <Settings2 className="h-4 w-4" /> Mapping
        </CardTitle>
        <CardDescription className="text-grey-mid">
          Tell ChurchCoin which columns correspond to our ledger fields. We pre-fill based on detected format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {renderSelect("Transaction date", mapping.date, "date")}
          {renderSelect("Description", mapping.description, "description")}
          {mapping.amountIn || mapping.amountOut ? (
            <>
              {renderSelect("Income Amount (In)", mapping.amountIn ?? "", "amountIn", true)}
              {renderSelect("Expense Amount (Out)", mapping.amountOut ?? "", "amountOut", true)}
            </>
          ) : (
            renderSelect("Amount", mapping.amount, "amount")
          )}
          {renderSelect("Reference", mapping.reference ?? "", "reference", true)}
          {renderSelect("Type", mapping.type ?? "", "type", true)}
        </div>
        <Button className="w-full border-ledger bg-ink text-paper" onClick={onConfirm}>
          Save mapping
        </Button>
      </CardContent>
    </Card>
  );
}
