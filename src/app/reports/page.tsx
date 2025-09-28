"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { BarChart3, FilePieChart } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Doc, type Id } from "@/lib/convexGenerated";

type FundBalanceSummary = {
  generatedAt: number;
  total: number;
  funds: {
    id: string;
    name: string;
    type: Doc<"funds">["type"];
    balance: number;
  }[];
};

type IncomeExpenseReport = {
  generatedAt: number;
  income: number;
  expense: number;
  net: number;
  transactions: Doc<"transactions">[];
};

type DonorStatementSummary = {
  donor: Doc<"donors">;
  transactions: Doc<"transactions">[];
  total: number;
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export default function ReportsPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [incomeStart, setIncomeStart] = useState(
    () => `${new Date().getFullYear()}-01-01`
  );
  const [incomeEnd, setIncomeEnd] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [statementStart, setStatementStart] = useState(
    () => `${new Date().getFullYear()}-01-01`
  );
  const [statementEnd, setStatementEnd] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [isExportingFund, setIsExportingFund] = useState(false);
  const [isExportingIncome, setIsExportingIncome] = useState(false);
  const [isExportingStatements, setIsExportingStatements] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const fundSummary = useQuery(
    api.reports.getFundBalanceSummary,
    churchId ? { churchId } : "skip"
  ) as FundBalanceSummary | undefined;
  const incomeExpense = useQuery(
    api.reports.getIncomeExpenseReport,
    churchId
      ? {
          churchId,
          startDate: incomeStart,
          endDate: incomeEnd,
        }
      : "skip"
  ) as IncomeExpenseReport | undefined;
  const donorStatements = useQuery(
    api.reports.getDonorStatementBatch,
    churchId
      ? {
          churchId,
          fromDate: `${new Date().getFullYear()}-01-01`,
          toDate: new Date().toISOString().slice(0, 10),
          fromDate: statementStart,
          toDate: statementEnd,
          fromDate: statementStart,
          toDate: statementEnd,
        }
      : "skip"
  ) as DonorStatementSummary[] | undefined;

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  const netResult = useMemo(() => {
    if (!incomeExpense) {
      return 0;
    }
    return incomeExpense.income - incomeExpense.expense;
  }, [incomeExpense]);

  const triggerDownload = async (response: Response, filename: string) => {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportFund = async () => {
    if (!churchId) {
      return;
    }
    setIsExportingFund(true);
    setReportError(null);
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "fund-balance", churchId }),
      });
      if (!response.ok) {
        throw new Error("Failed to export fund summary");
      }
      await triggerDownload(response, `fund-balance-${churchId}.pdf`);
    } catch (error) {
      console.error(error);
      setReportError("Unable to export the fund summary right now.");
    } finally {
      setIsExportingFund(false);
    }
  };

  const handleExportIncome = async () => {
    if (!churchId) {
      return;
    }
    setIsExportingIncome(true);
    setReportError(null);
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "income-expense",
          churchId,
          startDate: incomeStart,
          endDate: incomeEnd,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to export income & expenditure report");
      }
      await triggerDownload(response, `income-expense-${incomeStart}-${incomeEnd}.pdf`);
    } catch (error) {
      console.error(error);
      setReportError("Unable to export income & expenditure right now.");
    } finally {
      setIsExportingIncome(false);
    }
  };

  const handleExportStatements = async () => {
    if (!churchId) {
      return;
    }
    setIsExportingStatements(true);
    setReportError(null);
    try {
      const response = await fetch("/api/reports/donor-statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchId,
          fromDate: statementStart,
          toDate: statementEnd,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to export donor statements");
      }
      await triggerDownload(
        response,
        `donor-statements-${statementStart}-${statementEnd}.pdf`
      );
    } catch (error) {
      console.error(error);
      setReportError("Unable to export donor statements right now.");
    } finally {
      setIsExportingStatements(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-paper pb-12">
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-grey-mid">
                <FilePieChart className="h-5 w-5 text-grey-mid" />
                <span className="text-sm uppercase tracking-wide">Iteration 8</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Reporting & compliance</h1>
              <p className="text-sm text-grey-mid">
                Export trustee-ready summaries with the latest balances, income & expenditure, and donor statement batches.
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
              <BarChart3 className="mr-1 h-3 w-3" /> Net result {currency.format(netResult)} YTD
            </Badge>
            <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
              {donorStatements ? `${donorStatements.length} donor statements queued` : "No donor statements yet"}
            </Badge>
          </div>
          {reportError ? (
            <p className="rounded-md border border-error/40 bg-error/5 px-3 py-2 text-sm text-error">
              {reportError}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1.2fr,1fr]">
        <Card className="border-ledger bg-paper shadow-none">
          <CardHeader>
            <CardTitle className="text-ink">Fund balance snapshot</CardTitle>
            <CardDescription className="text-grey-mid">
              Current balances grouped by fund type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-grey-mid">
            {fundSummary ? (
              <>
                <p className="font-medium text-ink">Total across funds {currency.format(fundSummary.total)}</p>
                <ul className="space-y-2">
                  {fundSummary.funds.map((fund: FundBalanceSummary["funds"][number]) => (
                    <li key={fund.id} className="flex items-center justify-between rounded-md border border-ledger px-3 py-2">
                      <span className="font-medium text-ink">{fund.name}</span>
                      <span className="text-xs text-grey-mid">
                        {fund.type.toUpperCase()} · {currency.format(fund.balance)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="border-ledger font-primary"
                    onClick={handleExportFund}
                    disabled={isExportingFund}
                  >
                    {isExportingFund ? "Preparing PDF…" : "Export PDF"}
                  </Button>
                </div>
              </>
            ) : (
              <p>Balances will appear once you add funds.</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-ledger bg-paper shadow-none">
          <CardHeader>
            <CardTitle className="text-ink">Income & expenditure</CardTitle>
            <CardDescription className="text-grey-mid">
              Year-to-date totals by transaction type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-grey-mid">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-grey-mid">
                Period start
                <Input
                  type="date"
                  value={incomeStart}
                  onChange={(event) => setIncomeStart(event.target.value)}
                  className="font-primary"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-grey-mid">
                Period end
                <Input
                  type="date"
                  value={incomeEnd}
                  onChange={(event) => setIncomeEnd(event.target.value)}
                  className="font-primary"
                />
              </label>
            </div>
            {incomeExpense ? (
              <>
                <p>Income {currency.format(incomeExpense.income)}</p>
                <p>Expense {currency.format(incomeExpense.expense)}</p>
                <p className="font-medium text-ink">Net {currency.format(incomeExpense.net)}</p>
              </>
            ) : (
              <p>Record transactions to populate the income & expenditure report.</p>
            )}
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="border-ledger font-primary"
                onClick={handleExportIncome}
                disabled={isExportingIncome}
              >
                {isExportingIncome ? "Preparing PDF…" : "Export PDF"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-ledger bg-paper shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-ink">Donor statements</CardTitle>
            <CardDescription className="text-grey-mid">
              Preview donor totals ready for PDF export.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-grey-mid">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-grey-mid">
                From date
                <Input
                  type="date"
                  value={statementStart}
                  onChange={(event) => setStatementStart(event.target.value)}
                  className="font-primary"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-grey-mid">
                To date
                <Input
                  type="date"
                  value={statementEnd}
                  onChange={(event) => setStatementEnd(event.target.value)}
                  className="font-primary"
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="border-ledger font-primary"
                onClick={handleExportStatements}
                disabled={isExportingStatements || !donorStatements?.length}
              >
                {isExportingStatements ? "Preparing PDF…" : "Export PDF batch"}
              </Button>
            </div>
            {donorStatements && donorStatements.length > 0 ? (
              donorStatements.map((statement: DonorStatementSummary) => (
                <div key={statement.donor._id} className="flex items-center justify-between rounded-md border border-ledger px-3 py-2">
                  <div>
                    <p className="font-medium text-ink">{statement.donor.name}</p>
                    <p className="text-xs text-grey-mid">
                      {statement.transactions.length} gifts · {currency.format(statement.total)} total
                    </p>
                  </div>
                  <Button variant="outline" className="border-ledger font-primary" disabled>
                    PDF coming soon
                  </Button>
                </div>
              ))
            ) : (
              <p>No donor statements generated. Record donations to populate this section.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
      </div>
    </AuthGuard>
  );
}
