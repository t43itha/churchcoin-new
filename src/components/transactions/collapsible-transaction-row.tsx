"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Pencil, StickyNote, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatUkDateNumeric } from "@/lib/dates";
import type { Doc } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

type CollapsibleTransactionRowProps = {
  transaction: Doc<"transactions">;
  fund: Doc<"funds"> | null;
  category: Doc<"categories"> | null;
  donor: Doc<"donors"> | null;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
};

export function CollapsibleTransactionRow({
  transaction,
  fund,
  category,
  donor,
  onEdit,
  onDelete,
}: CollapsibleTransactionRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-highlight ${
          transaction.reconciled ? "bg-success/5" : ""
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="w-8">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-grey-mid" />
          ) : (
            <ChevronRight className="h-4 w-4 text-grey-mid" />
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {formatUkDateNumeric(transaction.date) || "—"}
        </TableCell>
        <TableCell className="min-w-[200px] font-medium">
          {transaction.description}
        </TableCell>
        <TableCell>{fund ? fund.name : "—"}</TableCell>
        <TableCell
          className={`text-right font-mono whitespace-nowrap ${
            transaction.type === "income" ? "text-success" : "text-error"
          }`}
        >
          {transaction.type === "income" ? "+" : "−"}
          {currency.format(transaction.amount)}
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={5} className="bg-[#FAF5E9] p-0">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Transaction Details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-grey-dark uppercase tracking-wide">
                    Transaction Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-grey-mid">Category:</span>{" "}
                      <span className="text-ink">
                        {category ? category.name : "Uncategorised"}
                      </span>
                    </div>
                    <div>
                      <span className="text-grey-mid">Source:</span>{" "}
                      <span className="text-ink">
                        {transaction.source === "csv"
                          ? "CSV import"
                          : transaction.source === "api"
                          ? "API import"
                          : "Manual entry"}
                      </span>
                    </div>
                    <div>
                      <span className="text-grey-mid">Reference:</span>{" "}
                      <span className="text-ink">
                        {transaction.reference || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Donor & Gift Aid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-grey-dark uppercase tracking-wide">
                    Donor &amp; Gift Aid
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-grey-mid">Donor:</span>{" "}
                      <span className="text-ink">
                        {donor ? donor.name : "Not linked"}
                      </span>
                    </div>
                    <div>
                      <span className="text-grey-mid">Gift Aid:</span>{" "}
                      <span className="text-ink">
                        {transaction.giftAid ? "Not eligible" : "Not eligible"}
                      </span>
                    </div>
                    <div>
                      <span className="text-grey-mid">Notes:</span>{" "}
                      <span className="text-ink">
                        {transaction.notes || "No notes"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit Trail */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-grey-dark uppercase tracking-wide">
                    Audit Trail
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-grey-mid">Created by:</span>{" "}
                      <span className="text-ink">
                        {transaction.enteredByName || "Unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="text-grey-mid">Created at:</span>{" "}
                      <span className="text-ink">
                        {formatDateTime(transaction._creationTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-grey-mid">Last modified:</span>{" "}
                      <span className="text-ink">—</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t border-ledger pt-4">
                <h4 className="text-xs font-semibold text-grey-dark uppercase tracking-wide mb-3">
                  Quick Actions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="h-8 px-3 text-xs"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add note functionality
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    <StickyNote className="mr-1.5 h-3.5 w-3.5" />
                    Add note
                  </Button>
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                      disabled={isDeleting}
                      className="h-8 px-3 text-xs text-error hover:text-error"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
