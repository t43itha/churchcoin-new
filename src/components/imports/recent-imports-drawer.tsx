"use client";

import { useState } from "react";
import { ArrowUpRight, Clock, FileText, Trash2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Doc, Id } from "@/lib/convexGenerated";
import { formatUkDateTime } from "@/lib/dates";

const statusLabels: Record<Doc<"csvImports">["status"], string> = {
  uploaded: "Uploaded",
  mapping: "Mapping",
  processing: "Processing",
  completed: "Complete",
  failed: "Failed",
};

type RecentImportsDrawerProps = {
  imports: Doc<"csvImports">[];
  activeImportId: Id<"csvImports"> | null;
  onSelect: (id: Id<"csvImports">) => void;
  onDelete?: (id: Id<"csvImports">) => Promise<void>;
};

export function RecentImportsDrawer({ imports, activeImportId, onSelect, onDelete }: RecentImportsDrawerProps) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importToDelete, setImportToDelete] = useState<Doc<"csvImports"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, importRecord: Doc<"csvImports">) => {
    e.stopPropagation();
    setImportToDelete(importRecord);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!importToDelete || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(importToDelete._id);
      setDeleteDialogOpen(false);
      setImportToDelete(null);
    } catch (error) {
      console.error("Failed to delete import:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="border-ledger text-sm text-ink">
          <Clock className="mr-2 h-4 w-4" /> Recent imports
          {imports.length > 0 ? (
            <Badge variant="secondary" className="ml-2 border-ledger bg-highlight text-ink">
              {imports.length}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full border-l border-ledger bg-paper sm:max-w-2xl">
        <SheetHeader className="gap-1">
          <SheetTitle className="text-left text-2xl font-semibold text-ink">Recent imports</SheetTitle>
          <SheetDescription className="text-left text-sm text-grey-mid">
            Track your CSV batches, reopen them for review, or export completed imports for audit.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3 overflow-y-auto">
          {imports.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-ledger bg-highlight/40 p-6 text-center text-sm text-grey-mid">
              <FileText className="h-6 w-6 text-grey-mid" />
              <p>No recent imports yet.</p>
              <p>Upload a CSV file to get started.</p>
            </div>
          ) : (
            imports.map((record) => (
              <div
                key={record._id}
                className={`flex flex-col gap-2 rounded-lg border px-4 py-3 transition ${
                  activeImportId === record._id ? "border-ink bg-highlight/60" : "border-ledger bg-paper"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="flex flex-1 flex-col gap-2 text-left"
                    onClick={() => {
                      onSelect(record._id);
                      setOpen(false);
                    }}
                  >
                    <span className="text-sm font-semibold text-ink">{record.filename}</span>
                    <p className="text-xs text-grey-mid">
                      Uploaded {formatUkDateTime(record.uploadedAt) || "—"}
                    </p>
                    <p className="text-xs text-grey-mid">
                      {record.processedCount}/{record.rowCount} processed · {record.duplicateCount} duplicates detected
                    </p>
                    <div className="flex items-center gap-2 text-xs text-ink">
                      Continue review
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant="secondary"
                      className={`${
                        record.status === "completed"
                          ? "border-success/40 bg-success/10 text-success"
                          : record.status === "failed"
                          ? "border-error/40 bg-error/10 text-error"
                          : "border-ledger bg-highlight text-ink"
                      }`}
                    >
                      {statusLabels[record.status] ?? record.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-error hover:bg-error/10 hover:text-error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(e, record);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete import?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{importToDelete?.filename}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <ul className="list-inside list-disc text-sm text-grey-mid">
              <li>{importToDelete?.rowCount || 0} CSV rows</li>
              <li>{importToDelete?.processedCount || 0} approved transactions</li>
            </ul>
            <p className="text-sm font-medium text-error">This action cannot be undone.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-error text-paper hover:bg-error/90"
            >
              {isDeleting ? "Deleting..." : "Delete import"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
