"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Layers, NotebookPen } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CsvUploadCard } from "@/components/imports/csv-upload-card";
import {
  MappingDrawer,
  type MappingConfig,
} from "@/components/imports/mapping-drawer";
import { DuplicateReview } from "@/components/imports/duplicate-review";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deriveMapping, type ParsedCsvRow } from "@/lib/csv";
import { api, type Doc, type Id } from "@/lib/convexGenerated";

type ParsedFileState = {
  filename: string;
  headers: string[];
  bankFormat: "barclays" | "hsbc" | "generic";
};

export default function ImportsPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedFileState | null>(null);
  const [mapping, setMapping] = useState<MappingConfig | null>(null);
  const [activeImportId, setActiveImportId] = useState<Id<"csvImports"> | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);

  const funds = useQuery(api.funds.getFunds, churchId ? { churchId } : "skip");
  const categories = useQuery(api.categories.getCategories, churchId ? { churchId } : "skip");
  const donors = useQuery(api.donors.getDonors, churchId ? { churchId } : "skip");
  const imports = useQuery(api.imports.listImports, churchId ? { churchId } : "skip");
  const rows = useQuery(api.imports.getImportRows, activeImportId ? { importId: activeImportId } : "skip");

  const createImport = useMutation(api.imports.createCsvImport);
  const saveRows = useMutation(api.imports.saveCsvRows);
  const markReady = useMutation(api.imports.markRowReady);
  const skipRow = useMutation(api.imports.skipRow);
  const approveRows = useMutation(api.imports.approveRows);

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  const handleFileParsed = ({
    filename,
    headers,
    bankFormat,
    rows,
  }: {
    filename: string;
    headers: string[];
    bankFormat: "barclays" | "hsbc" | "generic";
    rows: ParsedCsvRow[];
  }) => {
    setParsedFile({ filename, headers, bankFormat });
    setMapping(deriveMapping(headers));
    setParsedRows(rows);
    setStatusMessage(
      `Detected ${bankFormat.toUpperCase()} layout – review the column mapping before saving.`
    );
  };

  const handleConfirmMapping = async () => {
    if (!churchId || !mapping || !parsedFile) {
      return;
    }

    if (parsedRows.length === 0) {
      setStatusMessage("Upload a CSV before saving the mapping.");
      return;
    }

    if (!mapping.date || !mapping.description || !mapping.amount) {
      setStatusMessage("Please map the date, description, and amount columns before continuing.");
      return;
    }

    setStatusMessage("Saving import and queuing rows…");

    const importId = await createImport({
      churchId,
      filename: parsedFile.filename,
      bankFormat: parsedFile.bankFormat,
      mapping,
      rowCount: parsedRows.length,
    });

    const mappedRows = parsedRows.map((row) => {
      const rawAmount = Number(row[mapping.amount]);
      const amount = Number.isNaN(rawAmount) ? 0 : rawAmount;

      return {
        date: String(row[mapping.date] ?? ""),
        description: String(row[mapping.description] ?? ""),
        amount,
        reference: mapping.reference ? String(row[mapping.reference] ?? "") : undefined,
        type: mapping.type ? String(row[mapping.type] ?? "") : undefined,
      };
    });

    await saveRows({
      importId,
      rows: mappedRows,
    });

    setActiveImportId(importId);
    setParsedRows([]);
    setStatusMessage(`Saved ${parsedRows.length} rows. Review duplicates below before approving.`);
  };

  const handleApproveSelection = async (
    selection: {
      rowId: Id<"csvRows">;
      fundId: Id<"funds">;
      categoryId?: Id<"categories">;
      donorId?: Id<"donors">;
    }[]
  ) => {
    if (!churchId || !activeImportId) {
      return;
    }

    await approveRows({
      importId: activeImportId,
      churchId,
      rows: selection,
    });
    setStatusMessage(`Approved ${selection.length} rows. They are now in the ledger.`);
  };

  const latestRows = rows ?? [];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-paper pb-12">
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-grey-mid">
                <Layers className="h-5 w-5 text-grey-mid" />
                <span className="text-sm uppercase tracking-wide">Iteration 4</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">CSV import workspace</h1>
              <p className="text-sm text-grey-mid">
                Drag and drop bank exports, map the columns, and push transactions straight into the ledger with duplicate
                detection.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <span className="text-xs uppercase tracking-wide text-grey-mid">Active church</span>
              <Select
                value={churchId ?? undefined}
                onValueChange={(value) => setChurchId(value as Id<"churches">)}
              >
                <SelectTrigger className="w-[240px] font-primary">
                  <SelectValue placeholder="Select church" />
                </SelectTrigger>
                <SelectContent className="font-primary">
                  {churches?.map((church) => (
                    <SelectItem key={church._id} value={church._id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-grey-mid">
            <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
              <NotebookPen className="mr-1 h-3 w-3" /> AI categorisation hooks up in iteration 5
            </Badge>
            <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
              <ArrowRight className="mr-1 h-3 w-3" /> Import history stored for audit
            </Badge>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        {statusMessage ? (
          <div className="rounded-md border border-ledger bg-highlight/40 px-4 py-3 text-sm text-grey-mid">
            {statusMessage}
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-4">
            <CsvUploadCard onFileParsed={handleFileParsed} />
            {parsedFile && mapping ? (
              <MappingDrawer
                headers={parsedFile.headers}
                mapping={mapping}
                onChange={setMapping}
                onConfirm={handleConfirmMapping}
              />
            ) : null}
            {latestRows.length > 0 && funds && categories && donors ? (
              <DuplicateReview
                rows={latestRows as Doc<"csvRows">[]}
                funds={funds as Doc<"funds">[]}
                categories={categories as Doc<"categories">[]}
                donors={donors as Doc<"donors">[]}
                onMarkReady={(rowId, fundId, categoryId, donorId) =>
                  markReady({ rowId, fundId, categoryId, donorId })
                }
                onSkip={(rowId) => skipRow({ rowId })}
                onApproveSelection={handleApproveSelection}
              />
            ) : null}
          </div>
          <Card className="border-ledger bg-paper shadow-none">
            <CardHeader>
              <CardTitle className="text-ink">Recent imports</CardTitle>
              <CardDescription className="text-grey-mid">
                Track processing progress and reopen batches for review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-grey-mid">
              {imports && imports.length > 0 ? (
                imports.map((record: Doc<"csvImports">) => (
                  <button
                    key={record._id}
                    type="button"
                    className={`flex w-full flex-col rounded-md border border-ledger px-3 py-2 text-left transition hover:border-ink ${
                      activeImportId === record._id ? "bg-highlight/60" : "bg-paper"
                    }`}
                    onClick={() => setActiveImportId(record._id)}
                  >
                    <span className="font-medium text-ink">{record.filename}</span>
                    <span className="text-xs text-grey-mid">
                      {new Date(record.uploadedAt).toLocaleString()} · Status: {record.status}
                    </span>
                    <span className="text-xs text-grey-mid">
                      {record.processedCount}/{record.rowCount} processed · Duplicates {record.duplicateCount}
                    </span>
                  </button>
                ))
              ) : (
                <p>No imports yet. Upload a CSV to get started.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
<<<<<<< ours
<<<<<<< ours
    </div>
      </div>
    </AuthGuard>
  );
}
