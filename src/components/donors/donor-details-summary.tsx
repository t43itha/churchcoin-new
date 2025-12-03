"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { Mail, Phone, MapPin, Banknote, CheckCircle2, FileText, Archive, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Doc } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

function formatDateSafe(value?: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return dateFormatter.format(parsed);
}

type DonorDetailsSummaryProps = {
  donor: Doc<"donors">;
  givingTotals: {
    totalGiving: number;
    transactionCount: number;
    giftAidEligible: number;
    lastGiftDate: string | null;
  };
  onEdit: () => void;
  onArchive: () => void;
  onGenerateStatement: () => void;
};

export function DonorDetailsSummary({
  donor,
  givingTotals,
  onEdit,
  onArchive,
  onGenerateStatement,
}: DonorDetailsSummaryProps) {
  const formattedGiftAidDate = formatDateSafe(donor.giftAidDeclaration?.date);
  const formattedLastGiftDate = formatDateSafe(givingTotals.lastGiftDate);

  return (
    <div className="space-y-4">
      <header className="swiss-card flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink bg-white px-5 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-ink">{donor.name}</h2>
            {donor.giftAidDeclaration?.signed ? (
              <span className="swiss-badge flex items-center gap-1.5 bg-sage-light text-sage-dark border border-sage text-[10px]">
                <CheckCircle2 className="h-3.5 w-3.5" /> Gift Aid
              </span>
            ) : null}
          </div>
          {formattedLastGiftDate ? (
            <p className="text-xs text-grey-mid">
              Last gift on <span className="font-[family-name:var(--font-mono)]">{formattedLastGiftDate}</span>
            </p>
          ) : (
            <p className="text-xs text-grey-mid">No gifts recorded yet</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-ink text-ink hover:bg-ink hover:text-white transition-colors font-medium"
            onClick={onEdit}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-ink text-ink hover:bg-ink hover:text-white transition-colors font-medium"
            onClick={onGenerateStatement}
          >
            <FileText className="mr-2 h-4 w-4" /> Statement
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-error hover:text-error hover:bg-error-light"
            onClick={onArchive}
          >
            <Archive className="mr-2 h-4 w-4" /> Archive
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="swiss-card border border-ink bg-white shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="swiss-label flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-grey-mid">
              Contact details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-grey-mid">
            <ContactRow icon={Mail} label="Email" value={donor.email ?? "Not provided"} linkPrefix="mailto:" />
            <ContactRow icon={Phone} label="Phone" value={donor.phone ?? "Not provided"} linkPrefix="tel:" />
            <ContactRow icon={MapPin} label="Address" value={donor.address ?? "Not provided"} multiline />
            <ContactRow
              icon={Banknote}
              label="Bank reference"
              value={donor.bankReference ?? "Not provided"}
            />
          </CardContent>
        </Card>

        <Card className="swiss-card border border-ink bg-white shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="swiss-label flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-grey-mid">
              Gift Aid status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-grey-mid">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className={`swiss-badge text-[10px] ${donor.giftAidDeclaration?.signed ? "bg-sage-light text-sage-dark border border-sage" : "bg-ink/5 text-grey-mid border border-ink/20"}`}>
                {donor.giftAidDeclaration?.signed ? "Signed" : "Not signed"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Declaration date</span>
              <span className="font-medium text-ink font-[family-name:var(--font-mono)]">
                {formattedGiftAidDate ?? "—"}
              </span>
            </div>
            <p className="text-xs text-grey-mid">
              Gift Aid eligible total: <span className="font-medium text-sage font-[family-name:var(--font-mono)]">{currency.format(givingTotals.giftAidEligible || 0)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Total giving" value={currency.format(givingTotals.totalGiving || 0)} highlight />
        <SummaryTile label="Gift count" value={givingTotals.transactionCount.toString()} />
        <SummaryTile
          label="Gift Aid eligible"
          value={currency.format(givingTotals.giftAidEligible || 0)}
        />
        <SummaryTile
          label="Last gift"
          value={formattedLastGiftDate ?? "—"}
        />
      </div>

      {donor.notes ? (
        <div className="swiss-card rounded-lg border border-amber bg-amber-light/50 px-4 py-3 text-sm">
          <p className="swiss-label text-xs font-semibold uppercase tracking-widest text-amber-dark mb-1">Notes</p>
          <p className="whitespace-pre-line text-sm text-ink">{donor.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

type ContactRowProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  linkPrefix?: string;
  multiline?: boolean;
};

function ContactRow({ icon: Icon, label, value, linkPrefix, multiline }: ContactRowProps) {
  const trimmed = value?.trim();
  let content: ReactNode;

  if (!trimmed) {
    content = <span className="text-grey-light">Not provided</span>;
  } else if (linkPrefix) {
    content = (
      <a href={`${linkPrefix}${trimmed}`} className="text-ink transition hover:text-ink/80">
        {trimmed}
      </a>
    );
  } else {
    content = <span>{trimmed}</span>;
  }

  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-grey-mid" />
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide text-grey-light">{label}</p>
        <div className={multiline ? "whitespace-pre-line" : ""}>{content}</div>
      </div>
    </div>
  );
}

type SummaryTileProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

function SummaryTile({ label, value, highlight }: SummaryTileProps) {
  return (
    <div className={`swiss-card rounded-lg border px-4 py-3 ${highlight ? "border-ink bg-ink" : "border-ink bg-white"}`}>
      <p className={`swiss-label text-[10px] uppercase tracking-widest ${highlight ? "text-white/70" : "text-grey-mid"}`}>{label}</p>
      <p className={`mt-1 text-lg font-bold font-[family-name:var(--font-mono)] ${highlight ? "text-white" : "text-ink"}`}>{value}</p>
    </div>
  );
}
