"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Sparkles } from "lucide-react";

import { CsvUploadCard } from "@/components/imports/csv-upload-card";
import {
  MappingDrawer,
  type MappingConfig,
} from "@/components/imports/mapping-drawer";
import { DuplicateReview } from "@/components/imports/duplicate-review";
import { WorkflowStepper, type StepStatus, type WorkflowStep } from "@/components/imports/workflow-stepper";
import { StatusBanner } from "@/components/imports/status-banner";
import { RecentImportsDrawer } from "@/components/imports/recent-imports-drawer";
import { deriveMapping, normalizeCsvDate, type ParsedCsvRow } from "@/lib/csv";
import { useChurch } from "@/contexts/church-context";
import { api, type Doc, type Id } from "@/lib/convexGenerated";

type ParsedFileState = {
  filename: string;
  headers: string[];
  bankFormat: "barclays" | "hsbc" | "metrobank" | "generic";
};

type StatusAction = {
  label: string;
  onClick: () => void;
};

type StatusMessage = {
  variant: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
  actions?: StatusAction[];
};

export default function ImportsPage() {
  const { churchId } = useChurch();
  const [parsedFile, setParsedFile] = useState<ParsedFileState | null>(null);
  const [mapping, setMapping] = useState<MappingConfig | null>(null);
  const [activeImportId, setActiveImportId] = useState<Id<"csvImports"> | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);

  const funds = useQuery(api.funds.getFunds, churchId ? { churchId } : "skip");
  const categories = useQuery(api.categories.getSubcategoriesWithParents, churchId ? { churchId } : "skip");
  const donors = useQuery(api.donors.getDonors, churchId ? { churchId } : "skip");
  const imports = useQuery(api.imports.listImports, churchId ? { churchId } : "skip");
  const rows = useQuery(api.imports.getImportRows, activeImportId ? { importId: activeImportId } : "skip");

  const createImportWithRows = useMutation(api.imports.createImportWithRows);
  const skipRows = useMutation(api.imports.skipRows);
  const approveRows = useMutation(api.imports.approveRows);
  const autoApproveRows = useMutation(api.imports.autoApproveRows);
  const deleteImport = useMutation(api.imports.deleteImport);

  const showStatus = (message: StatusMessage) => {
    setStatusMessage(message);
  };

  const handleFileParsed = ({
    filename,
    headers,
    bankFormat,
    rows: parsed,
  }: {
    filename: string;
    headers: string[];
    bankFormat: "barclays" | "hsbc" | "metrobank" | "generic";
    rows: ParsedCsvRow[];
    rawContent: string;
  }) => {
    setParsedFile({ filename, headers, bankFormat });
    setMapping(deriveMapping(headers));
    setParsedRows(parsed);
    setActiveImportId(null);
    showStatus({
      variant: "info",
      title: `Detected ${bankFormat.toUpperCase()} layout`,
      description: "Review the column mapping before saving.",
    });
  };

  const handleConfirmMapping = async () => {
    if (!churchId || !mapping || !parsedFile) {
      return;
    }

    if (parsedRows.length === 0) {
      showStatus({
        variant: "warning",
        title: "Upload a CSV before saving the mapping.",
      });
      return;
    }

    if (!mapping.date || !mapping.description) {
      showStatus({
        variant: "warning",
        title: "Map the required columns",
        description: "Please map the date and description columns before continuing.",
      });
      return;
    }

    const hasAmountFields = mapping.amount || (mapping.amountIn && mapping.amountOut);
    if (!hasAmountFields) {
      showStatus({
        variant: "warning",
        title: "Amount mapping missing",
        description: "Please map the amount column(s) before continuing.",
      });
      return;
    }

    showStatus({
      variant: "info",
      title: "Processing import",
      description: "Detecting duplicates and AI matches…",
    });

    try {
      const mappedRows = parsedRows.map((row) => {
        let amount = 0;

        if (mapping.amountIn && mapping.amountOut) {
          const amountIn = Number(row[mapping.amountIn]) || 0;
          const amountOut = Number(row[mapping.amountOut]) || 0;
          amount = amountIn - amountOut;
        } else {
          const rawAmount = Number(row[mapping.amount]);
          amount = Number.isNaN(rawAmount) ? 0 : rawAmount;
        }

        return {
          date: normalizeCsvDate(row[mapping.date]),
          description: String(row[mapping.description] ?? ""),
          amount,
          reference: mapping.reference ? String(row[mapping.reference] ?? "") : undefined,
          type: mapping.type ? String(row[mapping.type] ?? "") : undefined,
        };
      });

      const importId = await createImportWithRows({
        churchId,
        filename: parsedFile.filename,
        bankFormat: parsedFile.bankFormat,
        mapping,
        rows: mappedRows,
      });

      setActiveImportId(importId);
      setParsedRows([]);
      showStatus({
        variant: "success",
        title: `Saved ${mappedRows.length} rows`,
        description: "Review duplicates below before approving.",
      });
    } catch (error) {
      showStatus({
        variant: "error",
        title: "Failed to save import",
        description: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Import error:", error);
    }
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
    showStatus({
      variant: "success",
      title: `Approved ${selection.length} rows`,
      description: "They are now available in the ledger.",
    });
  };

  const handleSkipSelection = async (rowIds: Id<"csvRows">[]) => {
    await skipRows({ rowIds });
    showStatus({
      variant: "info",
      title: `Skipped ${rowIds.length} row${rowIds.length === 1 ? "" : "s"}`,
    });
  };

  const handleAutoApprove = async () => {
    if (!churchId || !activeImportId) {
      return { approvedCount: 0, skippedCount: 0 };
    }

    const result = await autoApproveRows({
      importId: activeImportId,
      churchId,
    });

    showStatus({
      variant: "success",
      title: `Auto-approved ${result.approvedCount} high-confidence rows`,
      description: `${result.skippedCount} still require manual review.`,
    });

    return result;
  };

  const handleDeleteImport = async (importId: Id<"csvImports">) => {
    if (!churchId) return;

    const result = await deleteImport({ importId, churchId });

    // If the deleted import was active, clear it
    if (activeImportId === importId) {
      setActiveImportId(null);
    }

    showStatus({
      variant: "success",
      title: "Import deleted",
      description: `Deleted ${result.deletedRows} rows and ${result.deletedTransactions} transactions.`,
    });
  };

  const currentStep = useMemo(() => {
    if (activeImportId) {
      return 3;
    }
    if (parsedFile && mapping) {
      return 2;
    }
    return 1;
  }, [activeImportId, mapping, parsedFile]);

  const stepperSteps = useMemo<WorkflowStep[]>(() => {
    const statusFor = (stepNumber: number): StepStatus => {
      if (currentStep === stepNumber) return "active";
      if (currentStep > stepNumber) return "complete";
      return "upcoming";
    };

    return [
      {
        id: 1,
        label: "Upload CSV",
        description: "Drop your bank export",
        status: statusFor(1),
      },
      {
        id: 2,
        label: "Map columns",
        description: "Confirm the required fields",
        status: statusFor(2),
      },
      {
        id: 3,
        label: "Review & approve",
        description: "Assign funds and approve",
        status: statusFor(3),
      },
    ];
  }, [currentStep]);

  const handleResetToUpload = () => {
    setParsedFile(null);
    setParsedRows([]);
    setMapping(null);
    setActiveImportId(null);
  };

  return (
    <div className="min-h-screen bg-paper pb-16">
      <div className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-ink">CSV import workspace</h1>
                <p className="text-sm text-grey-mid leading-relaxed">
                  Upload CSV exports, map the required columns, and review AI-assisted recommendations before approving
                  transactions into the ledger.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="swiss-badge bg-sage-light text-sage-dark border border-sage">
                  <Sparkles className="mr-1 h-3 w-3" /> AI auto-detection active
                </span>
                <span className="swiss-badge bg-ink text-white">
                  Import history stored for audit
                </span>
              </div>
            </div>
            <RecentImportsDrawer
              imports={imports ?? []}
              activeImportId={activeImportId}
              onSelect={(importId) => setActiveImportId(importId)}
              onDelete={handleDeleteImport}
            />
          </div>
          <WorkflowStepper steps={stepperSteps} />
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        {statusMessage ? (
          <StatusBanner
            variant={statusMessage.variant}
            title={statusMessage.title}
            description={statusMessage.description}
            actions={statusMessage.actions}
            onDismiss={() => setStatusMessage(null)}
          />
        ) : null}

        <section className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="swiss-step-number-active flex items-center justify-center w-7 h-7 text-xs font-semibold">01</span>
              <h2 className="text-xl font-semibold text-ink">Upload CSV</h2>
            </div>
            <p className="text-sm text-grey-mid ml-10">Drop your bank export to detect the format automatically.</p>
          </div>
          <CsvUploadCard onFileParsed={handleFileParsed} />
        </section>

        {currentStep === 2 && parsedFile && mapping ? (
          <section className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="swiss-step-number-active flex items-center justify-center w-7 h-7 text-xs font-semibold">02</span>
                <h2 className="text-xl font-semibold text-ink">Map columns</h2>
              </div>
              <p className="text-sm text-grey-mid ml-10">Confirm the required fields and optional enrichments.</p>
            </div>
            <MappingDrawer
              headers={parsedFile.headers}
              previewRows={parsedRows}
              mapping={mapping}
              onChange={setMapping}
              onConfirm={handleConfirmMapping}
              onBack={handleResetToUpload}
            />
          </section>
        ) : null}

        {currentStep === 3 && (
          <section className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="swiss-step-number-active flex items-center justify-center w-7 h-7 text-xs font-semibold">03</span>
                <h2 className="text-xl font-semibold text-ink">Review &amp; Approve</h2>
              </div>
              <p className="text-sm text-grey-mid ml-10">
                Assign funds to each transaction and approve them into the ledger.
              </p>
            </div>

            {rows && rows.length > 0 && funds && categories && donors ? (
              <DuplicateReview
                rows={rows as Doc<"csvRows">[]}
                funds={funds as Doc<"funds">[]}
                categories={categories}
                donors={donors as Doc<"donors">[]}
                onApproveSelection={handleApproveSelection}
                onSkipSelection={handleSkipSelection}
                onAutoApprove={handleAutoApprove}
              />
            ) : (
              <div className="swiss-card rounded-lg border-2 border-dashed border-ink/20 bg-white px-6 py-12 text-center">
                <p className="text-grey-mid">
                  All rows have been processed. Upload a new CSV to start another import.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
