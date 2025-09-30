"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Banknote, LineChart, PiggyBank, PlusCircle } from "lucide-react";

import { FundCard, type FundCardSummary } from "@/components/funds/fund-card";
import { FundForm, type FundFormValues } from "@/components/funds/fund-form";
import { FundLedger } from "@/components/funds/fund-ledger";
import { FundPledgeForm, type FundPledgeFormValues } from "@/components/funds/fund-pledge-form";
import { PledgeImportDialog } from "@/components/funds/pledge-import-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api, type Doc, type Id } from "@/lib/convexGenerated";
import { formatUkDateNumeric } from "@/lib/dates";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

const pledgeStatusTone: Record<FundSupporter["computedStatus"], string> = {
  open: "border border-highlight/50 bg-highlight/30 text-grey-dark",
  fulfilled: "border border-success/40 bg-success/10 text-success",
  cancelled: "border border-error/40 bg-error/10 text-error",
};

type FundSupporter = {
  pledgeId: Id<"fundPledges">;
  donorId: Id<"donors">;
  donorName: string;
  amountPledged: number;
  amountDonated: number;
  outstandingAmount: number;
  pledgedAt: string;
  dueDate: string | null;
  status: "open" | "fulfilled" | "cancelled";
  computedStatus: string;
  completion: number;
  notes: string | null;
  lastDonationDate: string | null;
};

type FundContributor = {
  donorId: Id<"donors">;
  donorName: string;
  total: number;
  lastDonationDate: string | null;
};

type FundraisingSnapshot = {
  target: number | null;
  pledgedTotal: number;
  donationTotal: number;
  outstandingToTarget: number | null;
  pledgeCount: number;
  supporterCount: number;
  supporters: FundSupporter[];
  donorsWithoutPledge: FundContributor[];
};

type FundOverview = {
  fund: Doc<"funds">;
  incomeTotal: number;
  expenseTotal: number;
  lastTransactionDate: string | null;
  runningBalance: {
    transactionId: Id<"transactions">;
    date: string;
    description: string;
    type: "income" | "expense";
    amount: number;
    balance: number;
  }[];
  fundraising: FundraisingSnapshot | null;
};

export default function FundsPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingFund, setEditingFund] = useState<FundOverview | null>(null);
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [viewingFund, setViewingFund] = useState<FundOverview | null>(null);
  const [isPledgeDialogOpen, setIsPledgeDialogOpen] = useState(false);
  const [isCreatePledgeSubmitting, setIsCreatePledgeSubmitting] = useState(false);
  const [createPledgeError, setCreatePledgeError] = useState<string | null>(null);
  const [isPledgeImportOpen, setIsPledgeImportOpen] = useState(false);

  const fundsOverview = useQuery(
    api.funds.getFundsOverview,
    churchId ? { churchId } : "skip"
  );
  const donors = useQuery(
    api.donors.getDonors,
    churchId ? { churchId } : "skip"
  );

  const createFund = useMutation(api.funds.createFund);
  const updateFund = useMutation(api.funds.updateFund);
  const createPledge = useMutation(api.fundraising.createPledge);

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churchId, churches]);

  useEffect(() => {
    if (!viewingFund) {
      setIsPledgeDialogOpen(false);
      setCreatePledgeError(null);
    }
  }, [viewingFund]);

  const fundLookup = useMemo(() => {
    if (!fundsOverview) {
      return new Map<Id<"funds">, FundOverview>();
    }

    return new Map<Id<"funds">, FundOverview>(
      fundsOverview.map((entry) => [entry.fund._id, entry])
    );
  }, [fundsOverview]);

  const fundCards = useMemo<FundCardSummary[]>(() => {
    if (!fundsOverview) {
      return [];
    }

    return fundsOverview.map((entry) => ({
      id: entry.fund._id,
      name: entry.fund.name,
      type: entry.fund.type,
      balance: entry.fund.balance,
      description: entry.fund.description,
      restrictions: entry.fund.restrictions,
      incomeTotal: entry.incomeTotal,
      expenseTotal: entry.expenseTotal,
      lastTransactionDate: entry.lastTransactionDate,
      isFundraising: entry.fund.isFundraising ?? false,
      fundraisingTarget: entry.fund.fundraisingTarget ?? null,
      fundraisingRaised: entry.incomeTotal,
      fundraisingPledged: entry.fundraising?.pledgedTotal ?? 0,
      outstandingToTarget: entry.fundraising?.outstandingToTarget ?? null,
      supporterCount: entry.fundraising?.supporterCount ?? 0,
    }));
  }, [fundsOverview]);

  const fundraisingSnapshot = viewingFund?.fundraising ?? null;

  const totals = useMemo(() => {
    return fundCards.reduce(
      (acc, fund) => {
        acc.balance += fund.balance;
        acc.income += fund.incomeTotal;
        acc.expense += fund.expenseTotal;
        acc.count += 1;
        acc.byType[fund.type] = (acc.byType[fund.type] ?? 0) + 1;
        return acc;
      },
      {
        balance: 0,
        income: 0,
        expense: 0,
        count: 0,
        byType: {} as Record<FundCardSummary["type"], number>,
      }
    );
  }, [fundCards]);

  const handleCreateFund = async (values: FundFormValues) => {
    if (!churchId) {
      setCreateError("Select a church before creating funds");
      return;
    }

    setIsCreateSubmitting(true);
    setCreateError(null);

    try {
      await createFund({
        churchId,
        name: values.name.trim(),
        type: values.type,
        description: values.description?.trim()
          ? values.description.trim()
          : undefined,
        restrictions: values.restrictions?.trim()
          ? values.restrictions.trim()
          : undefined,
        isFundraising: values.isFundraising,
        fundraisingTarget:
          values.isFundraising && values.fundraisingTarget !== undefined
            ? values.fundraisingTarget
            : undefined,
      });
      setIsCreateOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create fund");
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  const handleUpdateFund = async (values: FundFormValues) => {
    if (!editingFund) {
      return;
    }

    setIsUpdateSubmitting(true);
    setUpdateError(null);

    try {
      await updateFund({
        fundId: editingFund.fund._id,
        name: values.name.trim(),
        type: values.type,
        description: values.description?.trim()
          ? values.description.trim()
          : null,
        restrictions: values.restrictions?.trim()
          ? values.restrictions.trim()
          : null,
        isFundraising: values.isFundraising,
        fundraisingTarget: values.isFundraising
          ? values.fundraisingTarget ?? null
          : null,
      });
      setEditingFund(null);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Unable to update fund");
    } finally {
      setIsUpdateSubmitting(false);
    }
  };

  const handleCreatePledge = async (values: FundPledgeFormValues) => {
    if (!viewingFund || !churchId) {
      setCreatePledgeError("Select a fund before adding pledges");
      return;
    }

    setIsCreatePledgeSubmitting(true);
    setCreatePledgeError(null);

    try {
      await createPledge({
        churchId,
        fundId: viewingFund.fund._id,
        donorId: values.donorId as Id<"donors">,
        amount: values.amount,
        pledgedAt: values.pledgedAt,
        dueDate: values.dueDate ?? undefined,
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
      });
      setIsPledgeDialogOpen(false);
    } catch (error) {
      setCreatePledgeError(error instanceof Error ? error.message : "Unable to save pledge");
    } finally {
      setIsCreatePledgeSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-12">
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-grey-mid">
                <PiggyBank className="h-5 w-5 text-grey-mid" />
                <span className="text-sm uppercase tracking-wide">Fund Management</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Church funds overview</h1>
              <p className="text-sm text-grey-mid">
                Monitor balances across every fund, capture restrictions, and drill into the running ledger.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <Select
                value={churchId ?? undefined}
                onValueChange={(value) => setChurchId(value as Id<"churches">)}
                disabled={!churches?.length}
              >
                <SelectTrigger className="min-w-[220px] border-ledger font-primary">
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
              <Button
                className="font-primary"
                onClick={() => {
                  setCreateError(null);
                  setIsCreateOpen(true);
                }}
                disabled={!churchId}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New fund
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-ledger">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                  <Banknote className="h-4 w-4 text-grey-mid" />
                  Total balance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-ink">
                {currency.format(totals.balance)}
              </CardContent>
            </Card>
            <Card className="border-ledger">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                  <LineChart className="h-4 w-4 text-grey-mid" />
                  Year-to-date movement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-success">+{currency.format(totals.income)}</span>
                  <span className="text-sm text-error">-{currency.format(totals.expense)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-ledger">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-grey-mid">
                  <PiggyBank className="h-4 w-4 text-grey-mid" />
                  Funds tracked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-2xl font-semibold text-ink">
                  {totals.count}
                  <div className="flex gap-2 text-xs text-grey-mid">
                    <Badge variant="outline" className="border-ledger text-grey-mid">
                      General {totals.byType.general ?? 0}
                    </Badge>
                    <Badge variant="outline" className="border-ledger text-grey-mid">
                      Restricted {totals.byType.restricted ?? 0}
                    </Badge>
                    <Badge variant="outline" className="border-ledger text-grey-mid">
                      Designated {totals.byType.designated ?? 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {!churchId ? (
          <div className="rounded-lg border border-dashed border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            Add a church to Convex and select it to begin tracking funds.
          </div>
        ) : null}
        {churchId && fundsOverview === undefined ? (
          <div className="rounded-lg border border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            Loading fund informationâ€¦
          </div>
        ) : null}
        {churchId && fundsOverview?.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ledger bg-paper px-6 py-10 text-center text-grey-mid">
            No funds created yet. Use the â€œNew fundâ€ button to create your first fund.
          </div>
        ) : null}
        {fundCards.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {fundCards.map((fund) => (
              <FundCard
                key={fund.id}
                fund={fund}
                onViewLedger={() => {
                  const entry = fundLookup.get(fund.id as Id<"funds">);
                  if (entry) {
                    setViewingFund(entry);
                  }
                }}
                onEdit={() => {
                  const entry = fundLookup.get(fund.id as Id<"funds">);
                  if (entry) {
                    setUpdateError(null);
                    setEditingFund(entry);
                  }
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new fund</DialogTitle>
          </DialogHeader>
          <FundForm
            onSubmit={handleCreateFund}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={isCreateSubmitting}
            errorMessage={createError}
            submitLabel={isCreateSubmitting ? "Creatingâ€¦" : "Create fund"}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingFund} onOpenChange={(open) => (!open ? setEditingFund(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit fund details</DialogTitle>
          </DialogHeader>
          {editingFund ? (
            <FundForm
              onSubmit={handleUpdateFund}
              onCancel={() => setEditingFund(null)}
              isSubmitting={isUpdateSubmitting}
              errorMessage={updateError}
              submitLabel={isUpdateSubmitting ? "Savingâ€¦" : "Save changes"}
              initialValues={{
                name: editingFund.fund.name,
                type: editingFund.fund.type,
                description: editingFund.fund.description ?? "",
                restrictions: editingFund.fund.restrictions ?? "",
                isFundraising: editingFund.fund.isFundraising ?? false,
                fundraisingTarget:
                  editingFund.fund.fundraisingTarget ?? undefined,
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet open={!!viewingFund} onOpenChange={(open) => (!open ? setViewingFund(null) : null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          {viewingFund ? (
            <div className="flex h-full flex-col gap-4">
              <SheetHeader className="border-b border-ledger pb-4">
                <SheetTitle className="flex items-center justify-between text-ink">
                  {viewingFund.fund.name}
                  <Badge variant="outline" className="border-ledger text-grey-mid">
                    {viewingFund.fund.type}
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-grey-mid">
                  {viewingFund.fund.description || "No description provided"}
                </SheetDescription>
                <div className="flex items-center gap-6 pt-2 text-sm text-grey-mid">
                  <div>
                    <p className="uppercase tracking-wide text-xs">Current balance</p>
                    <p className="text-lg font-semibold text-ink">
                      {currency.format(viewingFund.fund.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-xs">YTD income</p>
                    <p className="text-success">
                      +{currency.format(viewingFund.incomeTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-xs">YTD expense</p>
                    <p className="text-error">
                      -{currency.format(viewingFund.expenseTotal)}
                    </p>
                  </div>
                </div>
                {viewingFund.fund.restrictions ? (
                  <div className="rounded-md border border-dashed border-ledger bg-paper px-3 py-2 text-sm text-grey-mid">
                    <span className="font-medium text-grey-dark">Restrictions:</span>
                    <span className="ml-2 text-ink">{viewingFund.fund.restrictions}</span>
                  </div>
                ) : null}
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-6 pb-8">
                {viewingFund.fund.isFundraising && fundraisingSnapshot ? (
                  <div className="space-y-4 rounded-lg border border-ledger bg-paper p-4">
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-grey-mid">Raised</p>
                        <p className="text-lg font-semibold text-ink">
                          {currency.format(fundraisingSnapshot.donationTotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-grey-mid">Pledged</p>
                        <p className="text-lg font-semibold text-ink">
                          {currency.format(fundraisingSnapshot.pledgedTotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-grey-mid">Target</p>
                        <p className="text-lg font-semibold text-ink">
                          {fundraisingSnapshot.target
                            ? currency.format(fundraisingSnapshot.target)
                            : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-grey-mid">Supporters</p>
                        <p className="text-lg font-semibold text-ink">
                          {fundraisingSnapshot.supporterCount}
                        </p>
                      </div>
                    </div>
                    {fundraisingSnapshot.target ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-grey-mid">
                          <span>Progress</span>
                          <span>
                            {Math.min(
                              Math.round(
                                (fundraisingSnapshot.donationTotal /
                                  fundraisingSnapshot.target) *
                                  100
                              ),
                              100
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-ledger">
                          <div
                            className="h-2 rounded-full bg-success transition-all"
                            style={{
                              width: `${Math.min(
                                (fundraisingSnapshot.donationTotal /
                                  fundraisingSnapshot.target) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        {fundraisingSnapshot.outstandingToTarget !== null ? (
                          <p className="text-xs text-grey-mid">
                            {currency.format(fundraisingSnapshot.outstandingToTarget)} still to reach the target.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-ink">Pledges</h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-primary"
                          onClick={() => setIsPledgeImportOpen(true)}
                          disabled={!donors || donors.length === 0}
                        >
                          Import CSV
                        </Button>
                        <Button
                          size="sm"
                          className="font-primary"
                          onClick={() => {
                            setCreatePledgeError(null);
                            setIsPledgeDialogOpen(true);
                          }}
                          disabled={isCreatePledgeSubmitting || !donors || donors.length === 0}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add pledge
                        </Button>
                      </div>
                    </div>
                    {fundraisingSnapshot.supporters.length ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Donor</TableHead>
                              <TableHead>Pledged</TableHead>
                              <TableHead>Donated</TableHead>
                              <TableHead>Outstanding</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Last Gift</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fundraisingSnapshot.supporters.map((supporter) => (
                              <TableRow key={supporter.pledgeId}>
                                <TableCell>
                                  <div className="font-medium text-ink">{supporter.donorName}</div>
                                  {supporter.notes ? (
                                    <p className="text-xs text-grey-mid">{supporter.notes}</p>
                                  ) : null}
                                </TableCell>
                                <TableCell>{currency.format(supporter.amountPledged)}</TableCell>
                                <TableCell>{currency.format(supporter.amountDonated)}</TableCell>
                                <TableCell>{currency.format(supporter.outstandingAmount)}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={pledgeStatusTone[supporter.computedStatus]}
                                  >
                                    {supporter.computedStatus === "open"
                                      ? "Open"
                                      : supporter.computedStatus === "fulfilled"
                                      ? "Fulfilled"
                                      : "Cancelled"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {formatUkDateNumeric(supporter.dueDate) || "—"}
                                </TableCell>
                                <TableCell>
                                  {formatUkDateNumeric(supporter.lastDonationDate) || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-ledger bg-paper px-4 py-6 text-sm text-grey-mid">
                        No pledges recorded yet.
                      </div>
                    )}
                    {fundraisingSnapshot.donorsWithoutPledge.length ? (
                      <div className="rounded-md border border-ledger bg-paper px-3 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-grey-mid">
                          Donors without pledges
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-ink">
                          {fundraisingSnapshot.donorsWithoutPledge.map((donor) => (
                            <div
                              key={donor.donorId}
                              className="flex items-center justify-between gap-4"
                            >
                              <span>{donor.donorName}</span>
                              <span className="text-grey-mid">
                                {currency.format(donor.total)}
                                {donor.lastDonationDate
                                  ? ` - ${formatUkDateNumeric(donor.lastDonationDate)}`
                                  : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <FundLedger
                  entries={viewingFund.runningBalance.map((entry) => ({
                    transactionId: entry.transactionId,
                    date: entry.date,
                    description: entry.description,
                    type: entry.type,
                    amount: entry.amount,
                    balance: entry.balance,
                  }))}
                />
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
      <Dialog
        open={isPledgeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsPledgeDialogOpen(false);
            setCreatePledgeError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add pledge</DialogTitle>
          </DialogHeader>
          {viewingFund ? (
            <FundPledgeForm
              donors={(donors ?? []).map((donor) => ({
                id: donor._id,
                name: donor.name,
              }))}
              onSubmit={handleCreatePledge}
              onCancel={() => setIsPledgeDialogOpen(false)}
              isSubmitting={isCreatePledgeSubmitting}
              errorMessage={createPledgeError}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {viewingFund && churchId ? (
        <PledgeImportDialog
          open={isPledgeImportOpen}
          onOpenChange={setIsPledgeImportOpen}
          churchId={churchId}
          fund={viewingFund.fund}
        />
      ) : null}
    </div>
  );
}

