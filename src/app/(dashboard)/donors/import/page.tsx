"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";

import { DonorUploadCard } from "@/components/donors/donor-upload-card";
import {
  DonorMappingDrawer,
  type DonorMappingConfig,
} from "@/components/donors/donor-mapping-drawer";
import {
  DonorPreviewTable,
  type DonorPreviewRow,
} from "@/components/donors/donor-preview-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deriveDonorMapping, normalizeCsvDate, type ParsedCsvRow } from "@/lib/csv";
import { api, type Id } from "@/lib/convexGenerated";

type ParsedFileState = {
  filename: string;
  headers: string[];
};

export default function DonorImportPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedFileState | null>(null);
  const [mapping, setMapping] = useState<DonorMappingConfig | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [previewRows, setPreviewRows] = useState<DonorPreviewRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const donors = useQuery(api.donors.getDonors, churchId ? { churchId } : "skip");
  const bulkCreateDonors = useMutation(api.donors.bulkCreateDonors);

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

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
    setMapping(deriveDonorMapping(headers));
    setParsedRows(rows);
    setShowPreview(false);
    setStatusMessage(
      `Parsed ${rows.length} rows from ${filename}. Review the column mapping before previewing.`
    );
  };

  const parseGiftAidSigned = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    const str = String(value ?? "").toLowerCase().trim();
    return ["yes", "true", "1", "y"].includes(str);
  };

  const handleConfirmMapping = () => {
    if (!churchId || !mapping || !parsedFile || !donors) {
      return;
    }

    if (!mapping.name) {
      setStatusMessage("Please map the Name column before previewing.");
      return;
    }

    // Build preview with duplicate detection
    const preview: DonorPreviewRow[] = parsedRows.map((row, index) => {
      const name = String(row[mapping.name] ?? "").trim();
      const email = mapping.email ? String(row[mapping.email] ?? "").trim() : undefined;
      const phone = mapping.phone ? String(row[mapping.phone] ?? "").trim() : undefined;
      const address = mapping.address ? String(row[mapping.address] ?? "").trim() : undefined;
      const bankReference = mapping.bankReference
        ? String(row[mapping.bankReference] ?? "").trim()
        : undefined;
      const giftAidSigned = mapping.giftAidSigned
        ? parseGiftAidSigned(row[mapping.giftAidSigned])
        : false;
      const giftAidDate = mapping.giftAidDate
        ? normalizeCsvDate(row[mapping.giftAidDate])
        : undefined;
      const notes = mapping.notes ? String(row[mapping.notes] ?? "").trim() : undefined;

      // Check for duplicates
      let duplicateOf: Id<"donors"> | undefined;
      let duplicateReason: string | undefined;

      if (email) {
        const existingByEmail = donors.find((d) => d.email?.toLowerCase() === email.toLowerCase());
        if (existingByEmail) {
          duplicateOf = existingByEmail._id;
          duplicateReason = `Email "${email}" already exists`;
        }
      }

      if (!duplicateOf && bankReference) {
        const existingByRef = donors.find(
          (d) => d.bankReference?.toLowerCase() === bankReference.toLowerCase()
        );
        if (existingByRef) {
          duplicateOf = existingByRef._id;
          duplicateReason = `Bank reference "${bankReference}" already exists`;
        }
      }

      return {
        rowIndex: index,
        parsed: {
          name,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          bankReference: bankReference || undefined,
          giftAidSigned,
          giftAidDate: giftAidDate || undefined,
          notes: notes || undefined,
        },
        duplicateOf,
        duplicateReason,
        action: duplicateOf ? "skip" : "create",
      };
    });

    setPreviewRows(preview);
    setShowPreview(true);
    setStatusMessage(`Detected ${preview.filter((r) => r.duplicateOf).length} duplicate(s)`);
  };

  const handleBulkCreate = async (rowsToCreate: DonorPreviewRow[]) => {
    if (!churchId) {
      return;
    }

    const donorsToCreate = rowsToCreate.map((row) => ({
      name: row.parsed.name,
      email: row.parsed.email,
      phone: row.parsed.phone,
      address: row.parsed.address,
      bankReference: row.parsed.bankReference,
      giftAidDeclaration:
        row.parsed.giftAidSigned && row.parsed.giftAidDate
          ? {
              signed: true,
              date: row.parsed.giftAidDate,
            }
          : undefined,
      notes: row.parsed.notes,
    }));

    const result = await bulkCreateDonors({
      churchId,
      donors: donorsToCreate,
    });

    setStatusMessage(result.summary);
    setParsedFile(null);
    setParsedRows([]);
    setPreviewRows([]);
    setShowPreview(false);
  };

  return (
    <div className="min-h-screen bg-paper pb-12">
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Link
                href="/donors"
                className="flex items-center gap-2 text-sm text-grey-mid hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to donor directory
              </Link>
              <div className="flex items-center gap-2 text-grey-mid">
                <Upload className="h-5 w-5 text-grey-mid" />
                <span className="text-sm uppercase tracking-wide">Bulk Import</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Import donors from CSV</h1>
              <p className="text-sm text-grey-mid">
                Upload a CSV file, map columns, and bulk-create donors with duplicate detection.
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
          {statusMessage ? (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
                {statusMessage}
              </Badge>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        {!parsedFile ? (
          <DonorUploadCard onFileParsed={handleFileParsed} />
        ) : showPreview && donors ? (
          <DonorPreviewTable
            rows={previewRows}
            existingDonors={donors}
            onBulkCreate={handleBulkCreate}
            onBack={() => setShowPreview(false)}
          />
        ) : mapping ? (
          <DonorMappingDrawer
            headers={parsedFile.headers}
            mapping={mapping}
            onChange={setMapping}
            onConfirm={handleConfirmMapping}
          />
        ) : null}
      </div>
    </div>
  );
}
