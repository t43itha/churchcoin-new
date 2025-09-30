"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { detectBankFormat, parseCsv, type ParsedCsvRow } from "@/lib/csv";

type CsvUploadCardProps = {
  onFileParsed: (args: {
    filename: string;
    headers: string[];
    rows: ParsedCsvRow[];
    rawContent: string;
    bankFormat: "barclays" | "hsbc" | "metrobank" | "generic";
  }) => void;
};

export function CsvUploadCard({ onFileParsed }: CsvUploadCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const text = await file.text();
    const result = parseCsv(text);
    if (result.errors.length > 0) {
      setError(result.errors[0].message);
      return;
    }

    const rows = result.data.filter((row): row is ParsedCsvRow => Object.keys(row).length > 0);
    if (rows.length === 0) {
      setError("No rows detected in CSV");
      return;
    }

    const headers = result.meta.fields ?? Object.keys(rows[0]);
    const bankFormat = detectBankFormat(headers);

    setLastFileName(file.name);
    onFileParsed({
      filename: file.name,
      headers,
      rows,
      rawContent: text,
      bankFormat,
    });
  };

  return (
    <Card className="border-ledger bg-paper shadow-none">
      <CardHeader>
        <CardTitle className="text-ink">Upload bank export</CardTitle>
        <CardDescription className="text-grey-mid">
          We support Barclays, HSBC, and Metro Bank templates out of the box. Drop a CSV and we&apos;ll detect the format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-ledger bg-highlight/40 p-8 text-center hover:border-ink">
          <UploadCloud className="h-8 w-8 text-grey-mid" />
          <div className="text-sm text-grey-mid">
            {lastFileName ? (
              <span className="font-medium text-ink">{lastFileName}</span>
            ) : (
              <>
                <span className="font-medium text-ink">Drag & drop</span> or click to browse
              </>
            )}
          </div>
          <Input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
        </label>
        <Button
          variant="outline"
          className="w-full border-ledger font-primary"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv,text/csv";
            input.onchange = (event) => {
              const target = event.target as HTMLInputElement;
              const file = target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            };
            input.click();
          }}
        >
          Choose file
        </Button>
        {error ? (
          <p className="text-sm text-error">{error}</p>
        ) : (
          <p className="text-xs text-grey-mid">
            We&apos;ll keep the raw file in memory until you confirm the mapping. Nothing is sent to the server yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
