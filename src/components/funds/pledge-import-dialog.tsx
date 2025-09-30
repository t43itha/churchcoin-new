"use client";

import { useEffect, useState } from "react";
import { useConvex, useMutation } from "convex/react";
import { X } from "lucide-react";

import { PledgeUploadCard } from "./pledge-upload-card";
import { PledgeMappingDrawer, type PledgeMappingConfig } from "./pledge-mapping-drawer";
import { PledgePreviewTable, type PledgePreviewRow } from "./pledge-preview-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { derivePledgeMapping, normalizeCsvDate, type ParsedCsvRow } from "@/lib/csv";
import { api, type Doc, type Id } from "@/lib/convexGenerated";

type PledgeImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchId: Id<"churches">;
  fund: Doc<"funds">;
};

export function PledgeImportDialog({
  open,
  onOpenChange,
  churchId,
  fund,
}: PledgeImportDialogProps) {
  const convex = useConvex();
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [parsedFile, setParsedFile] = useState<{ filename: string; headers: string[] } | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [mapping, setMapping] = useState<PledgeMappingConfig | null>(null);
  const [previewRows, setPreviewRows] = useState<PledgePreviewRow[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const bulkCreatePledges = useMutation(api.fundraising.bulkCreatePledges);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setStep("upload");
      setParsedFile(null);
      setParsedRows([]);
      setMapping(null);
      setPreviewRows([]);
      setStatusMessage(null);
    }
  }, [open]);

  const handleFileParsed = ({
    filename,
    headers,
    rows,
  }: {
    filename: string;
    headers: string[];
    rows: ParsedCsvRow[];
  }) => {
    setParsedFile({ filename, headers });
    setMapping(derivePledgeMapping(headers));
    setParsedRows(rows);
    setStep("mapping");
    setStatusMessage(`Parsed ${rows.length} rows from ${filename}`);
  };

  const handleConfirmMapping = async () => {
    if (!mapping || !parsedFile) return;

    setStatusMessage("Matching donors...");

    // Build preview with donor matching
    const preview: PledgePreviewRow[] = await Promise.all(
      parsedRows.map(async (row, index) => {
        const donorName = String(row[mapping.donorName] ?? "").trim();
        const donorEmail = mapping.donorEmail ? String(row[mapping.donorEmail] ?? "").trim() : undefined;
        const amountStr = String(row[mapping.amount] ?? "0");
        const amount = parseFloat(amountStr.replace(/[£,$,\s]/g, ""));
        const pledgedDate = mapping.pledgedDate ? normalizeCsvDate(row[mapping.pledgedDate]) : "";
        const dueDate = mapping.dueDate ? normalizeCsvDate(row[mapping.dueDate]) : undefined;
        const notes = mapping.notes ? String(row[mapping.notes] ?? "").trim() : undefined;

        // Match donor
        let matchedDonor: PledgePreviewRow["matchedDonor"];
        let status: PledgePreviewRow["status"] = "no-match";

        if (donorName) {
          try {
            const match = await convex.query(api.fundraising.matchDonorByNameOrEmail, {
              churchId,
              name: donorName,
              email: donorEmail || undefined,
            });

            if (match.donor && match.confidence) {
              matchedDonor = {
                id: match.donor._id,
                name: match.donor.name,
                confidence: match.confidence as "high" | "medium" | "low",
              };
              status = "ready";
            }
          } catch {
            status = "error";
          }
        }

        return {
          rowIndex: index,
          parsed: {
            donorName,
            donorEmail: donorEmail || undefined,
            amount,
            pledgedDate,
            dueDate: dueDate || undefined,
            notes: notes || undefined,
          },
          matchedDonor,
          status,
          action: status === "ready" ? "create" : "skip",
        };
      })
    );

    setPreviewRows(preview);
    setStep("preview");
    setStatusMessage(`Matched ${preview.filter(r => r.status === "ready").length} of ${preview.length} pledges`);
  };

  const handleBulkCreate = async (rowsToCreate: PledgePreviewRow[]) => {
    const pledgesToCreate = rowsToCreate.map((row) => ({
      donorId: row.matchedDonor!.id,
      amount: row.parsed.amount,
      pledgedAt: row.parsed.pledgedDate,
      dueDate: row.parsed.dueDate,
      notes: row.parsed.notes,
    }));

    const result = await bulkCreatePledges({
      churchId,
      fundId: fund._id,
      pledges: pledgesToCreate,
    });

    setStatusMessage(result.summary);
    
    // Close dialog after successful import
    setTimeout(() => {
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Import pledges for {fund.name}</DialogTitle>
              <DialogDescription>
                Upload CSV, map columns, and create pledges with automatic donor matching.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {statusMessage ? (
            <div className="text-sm text-grey-mid bg-highlight/30 px-3 py-2 rounded-md">
              {statusMessage}
            </div>
          ) : null}
        </DialogHeader>

        <div className="space-y-4">
          {step === "upload" && (
            <PledgeUploadCard onFileParsed={handleFileParsed} />
          )}

          {step === "mapping" && mapping && parsedFile && (
            <PledgeMappingDrawer
              headers={parsedFile.headers}
              mapping={mapping}
              onChange={setMapping}
              onConfirm={handleConfirmMapping}
            />
          )}

          {step === "preview" && previewRows.length > 0 && (
            <PledgePreviewTable
              rows={previewRows}
              fundName={fund.name}
              onBulkCreate={handleBulkCreate}
              onBack={() => setStep("mapping")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
