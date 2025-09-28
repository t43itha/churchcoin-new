"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { BarChart3, FilePieChart } from "lucide-react";

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
  const fundSummary = useQuery(
    api.reports.getFundBalanceSummary,
    churchId ? { churchId } : "skip"
  ) as FundBalanceSummary | undefined;
  const incomeExpense = useQuery(
    api.reports.getIncomeExpenseReport,
    churchId
      ? {
          churchId,
          startDate: `${new Date().getFullYear()}-01-01`,
          endDate: new Date().toISOString().slice(0, 10),
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

  return (
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
            {incomeExpense ? (
              <>
                <p>Income {currency.format(incomeExpense.income)}</p>
                <p>Expense {currency.format(incomeExpense.expense)}</p>
                <p className="font-medium text-ink">Net {currency.format(incomeExpense.net)}</p>
              </>
            ) : (
              <p>Record transactions to populate the income & expenditure report.</p>
            )}
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
  );
}
