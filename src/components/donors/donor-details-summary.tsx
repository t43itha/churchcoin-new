"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { Mail, Phone, MapPin, Banknote, CheckCircle2, FileText, Archive, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ledger bg-paper px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-grey-mid">
            <h2 className="text-2xl font-semibold text-ink">{donor.name}</h2>
            {donor.giftAidDeclaration?.signed ? (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 border-success/40 bg-success/10 text-success"
              >
                <CheckCircle2 className="h-4 w-4" /> Gift Aid
              </Badge>
            ) : null}
          </div>
          {formattedLastGiftDate ? (
            <p className="text-xs text-grey-mid">
              Last gift on {formattedLastGiftDate}
            </p>
          ) : (
            <p className="text-xs text-grey-mid">No gifts recorded yet</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="border-ledger" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="border-ledger" onClick={onGenerateStatement}>
            <FileText className="mr-2 h-4 w-4" /> Statement
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-error hover:text-error"
            onClick={onArchive}
          >
            <Archive className="mr-2 h-4 w-4" /> Archive
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-ledger bg-paper shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-ink">
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

        <Card className="border-ledger bg-paper shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-ink">
              Gift Aid status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-grey-mid">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <Badge
                variant="secondary"
                className={donor.giftAidDeclaration?.signed ? "bg-success/10 text-success" : "bg-ledger text-grey-mid"}
              >
                {donor.giftAidDeclaration?.signed ? "Signed" : "Not signed"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Declaration date</span>
              <span className="font-medium text-ink">
                {formattedGiftAidDate ?? "—"}
              </span>
            </div>
            <p className="text-xs text-grey-mid">
              Gift Aid eligible total: {currency.format(givingTotals.giftAidEligible || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Total giving" value={currency.format(givingTotals.totalGiving || 0)} />
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
        <div className="rounded-lg border border-ledger bg-highlight/40 px-4 py-3 text-sm text-grey-mid">
          <p className="font-medium text-ink">Notes</p>
          <p className="whitespace-pre-line text-sm">{donor.notes}</p>
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
};

function SummaryTile({ label, value }: SummaryTileProps) {
  return (
    <div className="rounded-lg border border-ledger bg-paper px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-grey-light">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
