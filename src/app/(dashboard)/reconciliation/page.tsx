"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCheck, Download, FileWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useChurch } from "@/contexts/church-context";
import { api, type Doc, type Id } from "@/lib/convexGenerated";
import { formatUkDateNumeric } from "@/lib/dates";

type SuggestedMatch = {
  bankRowId: string;
  transactionId: string;
  confidence: number;
};

type PendingEntry = {
  record: Doc<"pendingTransactions">;
  transaction: Doc<"transactions"> | null;
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

export default function ReconciliationPage() {
  const { churchId } = useChurch();
  const sessions = useQuery(api.reconciliation.listSessions, churchId ? { churchId } : "skip");
  const [activeSession, setActiveSession] = useState<Doc<"reconciliationSessions"> | null>(null);
  const [bankBalance, setBankBalance] = useState(0);
  const [ledgerBalance, setLedgerBalance] = useState(0);

  const startSession = useMutation(api.reconciliation.startSession);
  const confirmMatch = useMutation(api.reconciliation.confirmMatch);
  const closeSession = useMutation(api.reconciliation.closeSession);
  const updateSession = useMutation(api.reconciliation.updateSessionProgress);
  const resolvePending = useMutation(api.transactions.resolvePendingTransaction);

  const matches = useQuery(
    api.reconciliation.suggestMatches,
    activeSession
      ? {
          sessionId: activeSession._id,
          importId: undefined,
        }
      : "skip"
  );
  const varianceReport = useQuery(
    api.reconciliation.getVarianceReport,
    activeSession ? { sessionId: activeSession._id } : "skip"
  );
  const pendingEntries = useQuery(
    api.transactions.listPendingTransactions,
    churchId ? { churchId } : "skip"
  ) as PendingEntry[] | undefined;

  const [adjustment, setAdjustment] = useState(0);
  const [sessionNotes, setSessionNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (sessions && sessions.length > 0) {
      setActiveSession(sessions[0]);
    }
  }, [sessions]);

  useEffect(() => {
    if (activeSession) {
      setAdjustment(varianceReport?.adjustments ?? activeSession.adjustments ?? 0);
      setSessionNotes(activeSession.notes ?? "");
    }
  }, [activeSession, varianceReport?.adjustments]);

  const pendingItems = useMemo(() => {
    return (pendingEntries ?? []).filter(
      (entry) => !entry.record.resolvedAt && entry.transaction
    );
  }, [pendingEntries]);

  const varianceValue = useMemo(() => {
    if (!activeSession) {
      return 0;
    }
    const pendingTotal = varianceReport?.pendingTotal ?? 0;
    const baseLedger = activeSession.ledgerBalance + adjustment - pendingTotal;
    return activeSession.bankBalance - baseLedger;
  }, [activeSession, varianceReport?.pendingTotal, adjustment]);
  const pendingTotal = varianceReport?.pendingTotal ?? 0;
  const unreconciledTotal = varianceReport?.unreconciledTotal ?? 0;

  const handleStartSession = async () => {
    if (!churchId) {
      return;
    }

    await startSession({
      churchId,
      month: new Date().toISOString().slice(0, 7),
      bankBalance,
      ledgerBalance,
    });

    if (sessions) {
      // Trigger refresh by clearing selection – the query will update automatically.
      setActiveSession(null);
    }
  };

  const handleSaveProgress = async () => {
    if (!activeSession) {
      return;
    }

    setIsSaving(true);
    try {
      await updateSession({
        sessionId: activeSession._id,
        adjustments: adjustment,
        notes: sessionNotes,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseActiveSession = async () => {
    if (!activeSession) {
      return;
    }

    setIsClosing(true);
    try {
      await closeSession({
        sessionId: activeSession._id,
        adjustments: adjustment,
        notes: sessionNotes,
      });
      setActiveSession(null);
    } finally {
      setIsClosing(false);
    }
  };

  const handleResolvePending = async (
    transactionId: Id<"transactions">,
    markCleared: boolean
  ) => {
    await resolvePending({ transactionId, markCleared });
  };

  const handleExportReport = async () => {
    if (!activeSession) {
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      const response = await fetch(
        `/api/reports/reconciliation?sessionId=${activeSession._id}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate reconciliation report");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `reconciliation-${activeSession.month}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setExportError("Unable to generate PDF export right now.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-12">
      {/* Header */}
      <div className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-ink">Bank reconciliation</h1>
              <p className="text-sm text-grey-mid leading-relaxed">
                Match bank transactions to the ledger, manage variances, and close each month with confidence.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="swiss-badge bg-sage-light text-sage-dark border border-sage">
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> AI-powered matching
            </span>
            <span className="swiss-badge bg-ink text-white">
              {matches ? `${matches.length} suggested matches` : "No matches yet"}
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1.2fr,1fr]">
        <div className="space-y-6">
          <Card className="swiss-card border border-ink bg-white">
            <CardHeader>
              <CardTitle className="text-ink">Start new reconciliation</CardTitle>
              <CardDescription className="text-grey-mid">
                Enter statement balances to begin matching transactions for the period.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Statement balance
                  <Input
                    type="number"
                    step="0.01"
                    value={bankBalance}
                    onChange={(event) => setBankBalance(Number(event.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Ledger balance
                  <Input
                    type="number"
                    step="0.01"
                    value={ledgerBalance}
                    onChange={(event) => setLedgerBalance(Number(event.target.value))}
                  />
                </label>
              </div>
              <Button className="border-ledger bg-ink text-paper" onClick={handleStartSession}>
                Begin reconciliation
              </Button>
            </CardContent>
          </Card>

          {activeSession ? (
            <Card className="swiss-card border border-ink bg-white">
              <CardHeader>
                <CardTitle className="text-ink">Month-end summary</CardTitle>
                <CardDescription className="text-grey-mid">
                  Reconcile balances, capture outstanding cheques, and document closing notes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-ledger bg-highlight/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-grey-mid">Bank balance</p>
                    <p className="text-lg font-semibold text-ink">
                      {currency.format(activeSession.bankBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-ledger bg-highlight/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-grey-mid">Ledger balance</p>
                    <p className="text-lg font-semibold text-ink">
                      {currency.format(activeSession.ledgerBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-ledger bg-paper p-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-grey-mid">
                      <FileWarning className="h-3.5 w-3.5" /> Outstanding items
                    </p>
                    <p className="text-lg font-semibold text-ink">
                      {currency.format(pendingTotal)}
                    </p>
                    <p className="text-xs text-grey-mid">{pendingItems.length} open items</p>
                  </div>
                  <div className="rounded-lg border border-ledger bg-paper p-4">
                    <p className="text-xs uppercase tracking-wide text-grey-mid">Unreconciled impact</p>
                    <p className="text-lg font-semibold text-ink">
                      {currency.format(unreconciledTotal)}
                    </p>
                    <p className="text-xs text-grey-mid">Transactions still awaiting match</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-ink">
                    Adjustments
                    <Input
                      type="number"
                      step="0.01"
                      value={adjustment}
                      onChange={(event) => setAdjustment(Number(event.target.value))}
                    />
                  </label>
                  <div className="rounded-lg border border-ledger bg-highlight/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-grey-mid">Variance</p>
                    <p
                      className={`text-lg font-semibold ${
                        Math.abs(varianceValue) < 0.01 ? "text-success" : "text-ink"
                      }`}
                    >
                      {currency.format(varianceValue)}
                    </p>
                    <p className="text-xs text-grey-mid">After adjustments and pending transactions</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-grey-mid">Month-end notes</label>
                  <Textarea
                    value={sessionNotes}
                    onChange={(event) => setSessionNotes(event.target.value)}
                    rows={4}
                    className="font-primary"
                    placeholder="Document any adjustments, explanations, or reviewer notes."
                  />
                </div>
                {exportError ? (
                  <p className="rounded-md border border-error/40 bg-error/5 px-3 py-2 text-sm text-error">
                    {exportError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-ledger font-primary"
                    disabled={isSaving}
                    onClick={handleSaveProgress}
                  >
                    {isSaving ? "Saving…" : "Save progress"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-ledger font-primary"
                    disabled={isExporting}
                    onClick={handleExportReport}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? "Preparing PDF…" : "Export reconciliation PDF"}
                  </Button>
                  <Button
                    className="border-ledger bg-ink text-paper"
                    disabled={isClosing}
                    onClick={handleCloseActiveSession}
                  >
                    {isClosing ? "Closing…" : "Close month"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="swiss-card border border-ink bg-white">
            <CardHeader>
              <CardTitle className="text-ink">Suggested matches</CardTitle>
              <CardDescription className="text-grey-mid">
                Review high-confidence pairings between bank activity and ledger transactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-grey-mid">
              {activeSession ? (
                matches && matches.length > 0 ? (
                  (matches as SuggestedMatch[]).map((match) => (
                    <div
                      key={`${match.bankRowId}-${match.transactionId}`}
                      className="flex items-center justify-between rounded-md border border-ledger px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-ink">{match.transactionId}</p>
                        <p className="text-xs text-grey-mid">
                          Confidence {(match.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-ledger font-primary"
                        onClick={() =>
                          confirmMatch({
                            sessionId: activeSession._id,
                            bankRowId: match.bankRowId as Id<"csvRows">,
                            transactionId: match.transactionId as Id<"transactions">,
                            confidence: match.confidence,
                          })
                        }
                      >
                        Confirm match
                      </Button>
                    </div>
                  ))
                ) : (
                  <p>No suggestions yet. Import bank data to generate matches.</p>
                )
              ) : (
                <p>Select a session to view suggested matches.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="swiss-card border border-ink bg-white">
            <CardHeader>
              <CardTitle className="text-ink">Sessions</CardTitle>
              <CardDescription className="text-grey-mid">
                Pick a session to review matches and close the month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-grey-mid">
              {sessions && sessions.length > 0 ? (
                sessions.map((session: Doc<"reconciliationSessions">) => (
                  <button
                    key={session._id}
                    type="button"
                    className={`flex w-full flex-col rounded-md border border-ledger px-3 py-2 text-left transition hover:border-ink ${
                      activeSession?._id === session._id ? "bg-highlight/60" : "bg-paper"
                    }`}
                    onClick={() => setActiveSession(session)}
                  >
                    <span className="font-medium text-ink">{session.month}</span>
                    <span className="text-xs text-grey-mid">Status: {session.status}</span>
                    <span className="text-xs text-grey-mid">
                      Bank {currency.format(session.bankBalance)} · Ledger {currency.format(session.ledgerBalance)}
                    </span>
                  </button>
                ))
              ) : (
                <p>No sessions yet. Start one on the left.</p>
              )}
            </CardContent>
          </Card>

          {activeSession ? (
            <Card className="swiss-card border border-ink bg-white">
              <CardHeader>
                <CardTitle className="text-ink">Outstanding items</CardTitle>
                <CardDescription className="text-grey-mid">
                  Track cheques and deposits that have not yet cleared the bank statement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-grey-mid">
                {pendingItems.length > 0 ? (
                  pendingItems.map((entry) => (
                    <div
                      key={entry.record._id}
                      className="flex flex-col gap-2 rounded-md border border-ledger px-3 py-2"
                    >
                      <div className="flex items-center justify-between text-ink">
                        <span className="font-medium">
                          {entry.transaction?.description ?? "Transaction"}
                        </span>
                        <span className="text-sm">
                          {entry.transaction
                            ? currency.format(
                                entry.transaction.type === "income"
                                  ? entry.transaction.amount
                                  : -entry.transaction.amount
                              )
                            : "—"}
                        </span>
                      </div>
                      <div className="text-xs text-grey-mid">
                        Recorded {formatUkDateNumeric(entry.record.createdAt) || "—"} · {" "}
                        {entry.record.reason}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="border-ledger font-primary"
                          onClick={() =>
                            handleResolvePending(
                              entry.transaction!._id as Id<"transactions">,
                              true
                            )
                          }
                        >
                          Mark cleared
                        </Button>
                        <Button
                          variant="ghost"
                          className="font-primary text-grey-mid hover:text-ink"
                          onClick={() =>
                            handleResolvePending(
                              entry.transaction!._id as Id<"transactions">,
                              false
                            )
                          }
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>All caught up! No pending items remain for this church.</p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
