"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Banknote, CheckCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { api, type Doc, type Id } from "@/lib/convexGenerated";

type SuggestedMatch = {
  bankRowId: string;
  transactionId: string;
  confidence: number;
};

export default function ReconciliationPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const sessions = useQuery(api.reconciliation.listSessions, churchId ? { churchId } : "skip");
  const [activeSession, setActiveSession] = useState<Doc<"reconciliationSessions"> | null>(null);
  const [bankBalance, setBankBalance] = useState(0);
  const [ledgerBalance, setLedgerBalance] = useState(0);

  const startSession = useMutation(api.reconciliation.startSession);
  const confirmMatch = useMutation(api.reconciliation.confirmMatch);
  const closeSession = useMutation(api.reconciliation.closeSession);

  const matches = useQuery(
    api.reconciliation.suggestMatches,
    activeSession
      ? {
          sessionId: activeSession._id,
          importId: undefined,
        }
      : "skip"
  );

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  useEffect(() => {
    if (sessions && sessions.length > 0) {
      setActiveSession(sessions[0]);
    }
  }, [sessions]);

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

  return (
    <div className="min-h-screen bg-paper pb-12">
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-grey-mid">
                <Banknote className="h-5 w-5 text-grey-mid" />
                <span className="text-sm uppercase tracking-wide">Iteration 7</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Bank reconciliation</h1>
              <p className="text-sm text-grey-mid">
                Match bank transactions to the ledger, manage variances, and close each month with confidence.
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
          <div className="flex flex-wrap items-center gap-3 text-xs text-grey-mid">
            <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
              <CheckCheck className="mr-1 h-3 w-3" /> AI-powered matching hooked up to CSV imports
            </Badge>
            <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
              {matches ? `${matches.length} suggested matches` : "No matches yet"}
            </Badge>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1.2fr,1fr]">
        <Card className="border-ledger bg-paper shadow-none">
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
        <Card className="border-ledger bg-paper shadow-none">
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
                    Bank £{session.bankBalance.toFixed(2)} · Ledger £{session.ledgerBalance.toFixed(2)}
                  </span>
                </button>
              ))
            ) : (
              <p>No sessions yet. Start one on the left.</p>
            )}
            {activeSession ? (
              <Button
                variant="outline"
                className="w-full border-ledger font-primary"
                onClick={() => closeSession({ sessionId: activeSession._id, adjustments: 0 })}
              >
                Close session
              </Button>
            ) : null}
          </CardContent>
        </Card>
        <Card className="border-ledger bg-paper shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-ink">Suggested matches</CardTitle>
            <CardDescription className="text-grey-mid">
              Review high-confidence pairings between bank activity and ledger transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-grey-mid">
            {matches && matches.length > 0 ? (
              (matches as SuggestedMatch[]).map((match) => (
                <div
                  key={`${match.bankRowId}-${match.transactionId}`}
                  className="flex items-center justify-between rounded-md border border-ledger px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-ink">{match.transactionId}</p>
                    <p className="text-xs text-grey-mid">Confidence {(match.confidence * 100).toFixed(0)}%</p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-ledger font-primary"
                    onClick={() =>
                      confirmMatch({
                        sessionId: activeSession!._id,
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
