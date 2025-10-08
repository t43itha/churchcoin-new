"use client";

import { useState } from "react";
import { Clock, UploadCloud } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [fileDetails, setFileDetails] = useState<{
    bankFormat: "barclays" | "hsbc" | "metrobank" | "generic";
    rowCount: number;
    columnCount: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setIsDragging(false);
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
    setFileDetails({ bankFormat, rowCount: rows.length, columnCount: headers.length });
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
          Follow the three-step flow to review and approve transactions. We support Barclays, HSBC, and Metro Bank templates
          out of the box.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ledger p-10 text-center transition ${
            isDragging ? "border-ink bg-highlight/70" : "bg-highlight/40 hover:border-ink"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
        >
          <UploadCloud className="h-10 w-10 text-grey-mid" />
          <div className="text-sm text-grey-mid">
            {lastFileName ? (
              <span className="font-medium text-ink">{lastFileName}</span>
            ) : (
              <>
                <span className="font-medium text-ink">Drag & drop</span> your CSV or click to browse
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-xs text-grey-mid">
            <Clock className="h-4 w-4" />
            Recently used templates (coming soon)
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <Button
              variant="outline"
              className="w-full border-ledger font-primary md:w-auto"
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
            <Button variant="outline" className="w-full border-ledger font-primary md:w-auto" disabled>
              Use saved template
            </Button>
          </div>
        </div>
        {fileDetails ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ledger bg-highlight/50 px-4 py-3 text-xs text-grey-mid">
            <Badge variant="secondary" className="border-ledger bg-paper text-ink">
              Format: {formatLabel(fileDetails.bankFormat)}
            </Badge>
            <span>{fileDetails.rowCount} rows detected</span>
            <span>{fileDetails.columnCount} columns</span>
          </div>
        ) : null}
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

function formatLabel(format: "barclays" | "hsbc" | "metrobank" | "generic") {
  switch (format) {
    case "barclays":
      return "Barclays";
    case "hsbc":
      return "HSBC";
    case "metrobank":
      return "Metro Bank";
    default:
      return "Generic";
  }
}
