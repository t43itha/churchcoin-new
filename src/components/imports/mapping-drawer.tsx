"use client";

import { useMemo } from "react";
import { ArrowLeft, Save, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ParsedCsvRow } from "@/lib/csv";

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
  previewRows: ParsedCsvRow[];
  mapping: MappingConfig;
  onChange: (mapping: MappingConfig) => void;
  onConfirm: () => void;
  onBack?: () => void;
};

export function MappingDrawer({ headers, previewRows, mapping, onChange, onConfirm, onBack }: MappingDrawerProps) {
  const options = useMemo(
    () => headers.map((header) => ({ value: header, label: header })),
    [headers]
  );

  const hasDualAmountColumns = Boolean(mapping.amountIn || mapping.amountOut);
  const sampleRows = previewRows.slice(0, 5);

  const renderSelect = (
    label: string,
    value: string | undefined,
    key: keyof MappingConfig,
    optionsList: { value: string; label: string }[],
    required = false,
    allowEmpty = false
  ) => {
    return (
      <label className="flex flex-col gap-1 text-sm text-ink">
        <span className="flex items-center justify-between">
          <span>
            {label}
            {required ? <span className="ml-1 text-error">*</span> : null}
          </span>
          {value ? <Badge variant="outline" className="text-xs">{value}</Badge> : null}
        </span>
        <select
          value={value ?? ""}
          onChange={(event) =>
            onChange({
              ...mapping,
              [key]: allowEmpty && event.target.value === "" ? undefined : event.target.value,
            })
          }
          className="h-10 rounded-md border border-ledger bg-paper px-3 text-sm text-ink transition focus:border-ink"
        >
          {allowEmpty ? <option value="">Ignore</option> : null}
          {optionsList.map((option) => (
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
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-ink">
              <Settings2 className="h-4 w-4" /> Map columns
            </CardTitle>
            <CardDescription className="text-grey-mid">
              Confirm how each column aligns with ChurchCoin fields. Required fields must be mapped before continuing.
            </CardDescription>
          </div>
          {onBack ? (
            <Button variant="ghost" size="sm" className="text-grey-mid hover:text-ink" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {sampleRows.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-grey-mid">Data preview</span>
              <span className="text-xs text-grey-mid">Showing first {sampleRows.length} rows</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-ledger">
              <Table>
                <TableHeader>
                  <TableRow className="bg-ledger/40">
                    {headers.map((header) => (
                      <TableHead key={header} className="whitespace-nowrap text-xs font-medium text-grey-dark">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleRows.map((row, index) => (
                    <TableRow key={index} className="text-xs text-grey-mid">
                      {headers.map((header) => (
                        <TableCell key={header} className="max-w-[180px] truncate">
                          {String(row[header] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-grey-mid">Required fields</span>
              <span className="text-xs text-grey-mid">All must be mapped</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {renderSelect("Transaction date", mapping.date, "date", options, true)}
              {renderSelect("Description", mapping.description, "description", options, true)}
              {hasDualAmountColumns ? (
                <>
                  {renderSelect("Income amount (In)", mapping.amountIn ?? "", "amountIn", options, true, true)}
                  {renderSelect("Expense amount (Out)", mapping.amountOut ?? "", "amountOut", options, true, true)}
                </>
              ) : (
                renderSelect("Amount", mapping.amount, "amount", options, true)
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-grey-mid">Optional enrichments</span>
              <span className="text-xs text-grey-mid">Improves duplicate detection</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {renderSelect("Reference", mapping.reference ?? "", "reference", options, false, true)}
              {renderSelect("Transaction type", mapping.type ?? "", "type", options, false, true)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-xs text-grey-mid">
            <Save className="h-4 w-4" />
            Save your preferred mappings for future imports (coming soon)
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Button
              type="button"
              variant="outline"
              className="border-ledger text-grey-mid hover:text-ink"
              disabled
            >
              Save as template
            </Button>
            <Button className="border-ledger bg-ink text-paper hover:bg-ink/90" onClick={onConfirm}>
              Confirm mapping
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
