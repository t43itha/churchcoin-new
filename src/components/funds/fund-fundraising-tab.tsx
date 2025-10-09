"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useMutation } from "convex/react";

import { FundraisingProgress } from "@/components/funds/fundraising-progress";
import { PledgeTable } from "@/components/funds/pledge-table";
import { FundPledgeEditDialog, type EditPledgeFormValues } from "@/components/funds/fund-pledge-edit-dialog";
import { type FundraisingSnapshot, type FundSupporter } from "@/components/funds/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { api, type Doc, type Id } from "@/lib/convexGenerated";
import { formatUkDateNumeric } from "@/lib/dates";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

type FundFundraisingTabProps = {
  fund: Doc<"funds">;
  fundraising: FundraisingSnapshot;
  onAddPledge: () => void;
  onImportPledges: () => void;
};

export function FundFundraisingTab({ fund, fundraising, onAddPledge, onImportPledges }: FundFundraisingTabProps) {
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]["value"]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSupporter, setEditingSupporter] = useState<FundSupporter | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingSupporter, setDeletingSupporter] = useState<FundSupporter | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const updatePledge = useMutation(api.fundraising.updatePledge);
  const deletePledge = useMutation(api.fundraising.deletePledge);

  const supporters = useMemo(() => {
    let filtered = fundraising.supporters;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((supporter) => supporter.computedStatus === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((supporter) =>
        supporter.donorName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [fundraising.supporters, statusFilter, searchQuery]);

  const handleEdit = (supporter: FundSupporter) => {
    setEditingSupporter(supporter);
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (supporter: FundSupporter) => {
    setDeletingSupporter(supporter);
    setIsDeleteDialogOpen(true);
  };

  const handleEditSubmit = async (values: EditPledgeFormValues) => {
    if (!editingSupporter) return;

    setIsEditSubmitting(true);
    setEditError(null);

    try {
      await updatePledge({
        pledgeId: editingSupporter.pledgeId as Id<"fundPledges">,
        amount: values.amount,
        pledgedAt: values.pledgedAt,
        dueDate: values.dueDate?.trim() || null,
        notes: values.notes?.trim() || null,
        status: values.status,
      });
      setIsEditDialogOpen(false);
      setEditingSupporter(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Unable to update pledge");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSupporter) return;

    try {
      await deletePledge({
        pledgeId: deletingSupporter.pledgeId as Id<"fundPledges">,
      });
      setIsDeleteDialogOpen(false);
      setDeletingSupporter(null);
    } catch (error) {
      // Error will be shown in a toast or similar in the future
      console.error("Failed to delete pledge:", error);
    }
  };

  return (
    <div className="space-y-8">
      <FundraisingProgress
        pledgedTotal={fundraising.pledgedTotal}
        donationTotal={fundraising.donationTotal}
        target={fund.fundraisingTarget ?? null}
        outstandingToTarget={fundraising.outstandingToTarget}
        supporterCount={fundraising.supporterCount}
      />

      <Card className="border-ledger bg-paper">
        <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xs uppercase tracking-wide text-grey-mid">Pledge management</CardTitle>
            <p className="text-sm text-grey-mid">
              Manage pledges, monitor fulfilment, and coordinate donor follow-up.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="font-primary" onClick={onAddPledge}>
              Add pledge
            </Button>
            <Button size="sm" variant="outline" className="font-primary" onClick={onImportPledges}>
              Import CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-grey-mid">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-full border px-3 py-1 transition-colors ${
                    statusFilter === filter.value
                      ? "border-ink bg-ink text-paper"
                      : "border-ledger text-grey-mid hover:border-ink hover:text-ink"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-mid" />
              <Input
                type="text"
                placeholder="Search donors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-ledger bg-paper pl-9 font-primary text-sm"
              />
            </div>
          </div>
          <PledgeTable
            supporters={supporters}
            emptyMessage="No pledges match your filters."
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {fundraising.donorsWithoutPledge.length > 0 ? (
        <Card className="border-ledger bg-paper">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-grey-mid">Donors without pledges</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 md:grid-cols-2">
              {fundraising.donorsWithoutPledge.map((donor) => {
                const lastDonation = donor.lastDonationDate
                  ? formatUkDateNumeric(donor.lastDonationDate) || "—"
                  : "—";
                return (
                  <li key={donor.donorId} className="rounded-md border border-ledger px-4 py-3">
                    <div className="font-medium text-ink">{donor.donorName}</div>
                    <div className="text-xs text-grey-mid">
                      {donor.total > 0
                        ? `${currency.format(donor.total)} donated historically`
                        : "No donations yet"}
                    </div>
                    <div className="text-xs text-grey-mid">Last gift {lastDonation}</div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <FundPledgeEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        supporter={editingSupporter}
        onSubmit={handleEditSubmit}
        isSubmitting={isEditSubmitting}
        errorMessage={editError}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-ledger bg-paper font-primary">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ink">Delete pledge?</AlertDialogTitle>
            <AlertDialogDescription className="text-grey-mid">
              Are you sure you want to delete the pledge from{" "}
              <span className="font-medium text-ink">{deletingSupporter?.donorName}</span>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-ledger font-primary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-error font-primary text-paper hover:bg-error/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
