"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { FilePieChart, Sparkles } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type Id } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export default function ReportsPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const [currentYear] = useState(() => new Date().getFullYear().toString());
  
  const [incomeStart, setIncomeStart] = useState(`${currentYear}-01-01`);
  const [incomeEnd, setIncomeEnd] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [giftAidStart, setGiftAidStart] = useState(`${currentYear}-01-01`);
  const [giftAidEnd, setGiftAidEnd] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [monthlyStart, setMonthlyStart] = useState(`${currentYear}-01-01`);
  const [monthlyEnd, setMonthlyEnd] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [statementStart, setStatementStart] = useState(`${currentYear}-01-01`);
  const [statementEnd, setStatementEnd] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [reportError, setReportError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    fund: false,
    income: false,
    giftAid: false,
    annual: false,
    monthly: false,
    statements: false,
  });
  
  const [narratives, setNarratives] = useState<Record<string, string>>({});
  const [generatingNarrative, setGeneratingNarrative] = useState<string | null>(null);
  
  const generateNarrative = useMutation(api.ai.generateReportNarrative);

  const fundSummary = useQuery(
    api.reports.getFundBalanceSummary,
    churchId ? { churchId } : "skip"
  );
  
  const incomeExpense = useQuery(
    api.reports.getIncomeExpenseReport,
    churchId ? { churchId, startDate: incomeStart, endDate: incomeEnd } : "skip"
  );
  
  const giftAidReport = useQuery(
    api.reports.getGiftAidClaimReport,
    churchId ? { churchId, startDate: giftAidStart, endDate: giftAidEnd } : "skip"
  );
  
  const annualSummary = useQuery(
    api.reports.getAnnualSummaryReport,
    churchId ? { churchId, year: currentYear } : "skip"
  );
  
  const monthlyReport = useQuery(
    api.reports.getMonthlyIncomeExpenseReport,
    churchId ? { churchId, startDate: monthlyStart, endDate: monthlyEnd } : "skip"
  );
  
  const tithesStatements = useQuery(
    api.reports.getDonorStatementBatch,
    churchId ? { churchId, fromDate: statementStart, toDate: statementEnd, fundType: "general" } : "skip"
  );
  
  const buildingFundStatements = useQuery(
    api.reports.getDonorStatementBatch,
    churchId ? { churchId, fromDate: statementStart, toDate: statementEnd, fundType: "restricted" } : "skip"
  );

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  const handleGenerateNarrative = async (reportType: string, reportData: unknown) => {
    if (!churchId) return;
    
    setGeneratingNarrative(reportType);
    try {
      const result = await generateNarrative({
        churchId,
        reportType: reportType as "fund-balance" | "income-expense" | "gift-aid" | "annual-summary" | "monthly",
        reportData,
      });
      setNarratives((prev) => ({ ...prev, [reportType]: result.narrative }));
    } catch (error) {
      console.error("Failed to generate narrative:", error);
      setReportError("Unable to generate AI narrative");
    } finally {
      setGeneratingNarrative(null);
    }
  };

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

  const handleExportReport = async (type: string, params: Record<string, unknown>, filename: string) => {
    if (!churchId) return;
    
    setLoadingStates((prev) => ({ ...prev, [type]: true }));
    setReportError(null);
    
    try {
      const response = await fetch(`/api/reports/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchId, ...params }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API Error (${type}):`, errorData);
        const errorMessage = errorData.details || errorData.error || `Failed to export ${type} report`;
        throw new Error(errorMessage);
      }
      
      await triggerDownload(response, filename);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : `Unable to export ${type} report`;
      setReportError(errorMessage);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-12">
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-grey-mid">
                <FilePieChart className="h-5 w-5 text-grey-mid" />
                <span className="text-sm uppercase tracking-wide">Statements</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Reports & Compliance</h1>
              <p className="text-sm text-grey-mid">
                Generate trustee-ready summaries with AI-powered insights and Gift Aid claims
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
          
          {reportError && (
            <p className="rounded-md border border-error/40 bg-error/5 px-3 py-2 text-sm text-error">
              {reportError}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Tabs defaultValue="financial" className="space-y-6">
          <TabsList className="font-primary">
            <TabsTrigger value="financial">Financial Reports</TabsTrigger>
            <TabsTrigger value="compliance">Compliance & Gift Aid</TabsTrigger>
            <TabsTrigger value="donors">Donor Statements</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-6">
            {/* Fund Balance Summary */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink">Fund Balance Snapshot</CardTitle>
                <CardDescription className="text-grey-mid">
                  Current balances grouped by fund type
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {fundSummary && (
                  <>
                    <p className="font-medium text-ink">Total: {currency.format(fundSummary.total)}</p>
                    <div className="space-y-2">
                      {fundSummary.funds.map((fund) => (
                        <div key={fund.id} className="flex justify-between rounded-md border border-ledger px-3 py-2">
                          <span className="font-medium text-ink">{fund.name}</span>
                          <span className="text-xs text-grey-mid">
                            {fund.type.toUpperCase()} · {currency.format(fund.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 pt-3">
                      <Button
                        variant="outline"
                        className="border-ledger font-primary"
                        onClick={() => handleExportReport("export", { type: "fund-balance" }, `fund-balance.pdf`)}
                        disabled={loadingStates.fund}
                      >
                        {loadingStates.fund ? "Preparing..." : "Export PDF"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="border-ledger font-primary gap-2"
                        onClick={() => handleGenerateNarrative("fund-balance", fundSummary)}
                        disabled={generatingNarrative === "fund-balance"}
                      >
                        <Sparkles className="h-4 w-4" />
                        {generatingNarrative === "fund-balance" ? "Generating..." : "AI Insights"}
                      </Button>
                    </div>
                    
                    {narratives["fund-balance"] && (
                      <div className="mt-4 rounded-md border border-ledger bg-highlight p-4">
                        <p className="text-sm text-grey-dark whitespace-pre-wrap">{narratives["fund-balance"]}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Income & Expenditure */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink">Income & Expenditure</CardTitle>
                <CardDescription className="text-grey-mid">
                  Period-based income and expense analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-grey-mid">Start Date</span>
                    <Input
                      type="date"
                      value={incomeStart}
                      onChange={(e) => setIncomeStart(e.target.value)}
                      className="font-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-grey-mid">End Date</span>
                    <Input
                      type="date"
                      value={incomeEnd}
                      onChange={(e) => setIncomeEnd(e.target.value)}
                      className="font-primary"
                    />
                  </label>
                </div>

                {incomeExpense && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm">Income: {currency.format(incomeExpense.income)}</p>
                      <p className="text-sm">Expense: {currency.format(incomeExpense.expense)}</p>
                      <p className="font-medium text-ink">Net: {currency.format(incomeExpense.net)}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="border-ledger font-primary"
                        onClick={() => handleExportReport("export", {
                          type: "income-expense",
                          startDate: incomeStart,
                          endDate: incomeEnd
                        }, `income-expense-${incomeStart}-${incomeEnd}.pdf`)}
                        disabled={loadingStates.income}
                      >
                        {loadingStates.income ? "Preparing..." : "Export PDF"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="border-ledger font-primary gap-2"
                        onClick={() => handleGenerateNarrative("income-expense", incomeExpense)}
                        disabled={generatingNarrative === "income-expense"}
                      >
                        <Sparkles className="h-4 w-4" />
                        {generatingNarrative === "income-expense" ? "Generating..." : "AI Insights"}
                      </Button>
                    </div>
                    
                    {narratives["income-expense"] && (
                      <div className="mt-4 rounded-md border border-ledger bg-highlight p-4">
                        <p className="text-sm text-grey-dark whitespace-pre-wrap">{narratives["income-expense"]}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Monthly Breakdown */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink">Monthly Breakdown</CardTitle>
                <CardDescription className="text-grey-mid">
                  Month-by-month income and expense trends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-grey-mid">Start Date</span>
                    <Input
                      type="date"
                      value={monthlyStart}
                      onChange={(e) => setMonthlyStart(e.target.value)}
                      className="font-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-grey-mid">End Date</span>
                    <Input
                      type="date"
                      value={monthlyEnd}
                      onChange={(e) => setMonthlyEnd(e.target.value)}
                      className="font-primary"
                    />
                  </label>
                </div>

                {monthlyReport && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm">Total Income: {currency.format(monthlyReport.totalIncome)}</p>
                      <p className="text-sm">Total Expense: {currency.format(monthlyReport.totalExpense)}</p>
                      <p className="text-sm">Average Monthly Income: {currency.format(monthlyReport.averageMonthlyIncome)}</p>
                      <p className="text-sm">Average Monthly Expense: {currency.format(monthlyReport.averageMonthlyExpense)}</p>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto border border-ledger rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-highlight sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Month</th>
                            <th className="px-3 py-2 text-right font-medium">Income</th>
                            <th className="px-3 py-2 text-right font-medium">Expense</th>
                            <th className="px-3 py-2 text-right font-medium">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyReport.monthlyBreakdown.map((month) => (
                            <tr key={month.month} className="border-t border-ledger">
                              <td className="px-3 py-2">{month.month}</td>
                              <td className="px-3 py-2 text-right">{currency.format(month.income)}</td>
                              <td className="px-3 py-2 text-right">{currency.format(month.expense)}</td>
                              <td className="px-3 py-2 text-right font-medium">{currency.format(month.net)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-3">
                      {monthlyReport.monthlyBreakdown.map((month) => (
                        <div
                          key={`${month.month}-subcategory`}
                          className="rounded-md border border-ledger"
                        >
                          <div className="flex items-center justify-between bg-highlight px-3 py-2">
                            <span className="text-sm font-medium text-ink">{month.month}</span>
                            <span className="text-xs uppercase tracking-wide text-grey-mid">
                              Subcategory breakdown
                            </span>
                          </div>

                          {month.subcategoryBreakdown && month.subcategoryBreakdown.length > 0 ? (
                            <div className="max-h-56 overflow-y-auto">
                              <table className="w-full text-xs md:text-sm">
                                <thead className="bg-paper">
                                  <tr className="border-b border-ledger">
                                    <th className="px-3 py-2 text-left font-medium">Subcategory</th>
                                    <th className="px-3 py-2 text-left font-medium">Parent</th>
                                    <th className="px-3 py-2 text-left font-medium">Type</th>
                                    <th className="px-3 py-2 text-right font-medium">Income</th>
                                    <th className="px-3 py-2 text-right font-medium">Expense</th>
                                    <th className="px-3 py-2 text-right font-medium">Net</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {month.subcategoryBreakdown.map((subcategory) => (
                                    <tr key={`${month.month}-${subcategory.categoryId}`} className="border-b border-ledger/60 last:border-b-0">
                                      <td className="px-3 py-2 text-ink">
                                        {subcategory.categoryName}
                                      </td>
                                      <td className="px-3 py-2 text-grey-mid">
                                        {subcategory.parentCategoryName ?? "—"}
                                      </td>
                                      <td className="px-3 py-2 capitalize text-grey-mid">
                                        {subcategory.type}
                                      </td>
                                      <td className="px-3 py-2 text-right text-ink">
                                        {currency.format(subcategory.income)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-grey-mid">
                                        {currency.format(subcategory.expense)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-medium text-ink">
                                        {currency.format(subcategory.net)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="px-3 py-3 text-xs text-grey-mid">
                              No categorized transactions recorded for this month.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      className="border-ledger font-primary gap-2"
                      onClick={() => handleGenerateNarrative("monthly", monthlyReport)}
                      disabled={generatingNarrative === "monthly"}
                    >
                      <Sparkles className="h-4 w-4" />
                      {generatingNarrative === "monthly" ? "Generating..." : "AI Insights"}
                    </Button>
                    
                    {narratives["monthly"] && (
                      <div className="mt-4 rounded-md border border-ledger bg-highlight p-4">
                        <p className="text-sm text-grey-dark whitespace-pre-wrap">{narratives["monthly"]}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Annual Summary */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink">Annual Summary {currentYear}</CardTitle>
                <CardDescription className="text-grey-mid">
                  Year-end summary with fund movements and category breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {annualSummary && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm">Total Income: {currency.format(annualSummary.totalIncome)}</p>
                      <p className="text-sm">Total Expense: {currency.format(annualSummary.totalExpense)}</p>
                      <p className="font-medium text-ink">Net Surplus: {currency.format(annualSummary.netSurplus)}</p>
                      <p className="text-xs text-grey-mid">{annualSummary.transactionCount} transactions</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="border-ledger font-primary gap-2"
                        onClick={() => handleGenerateNarrative("annual-summary", annualSummary)}
                        disabled={generatingNarrative === "annual-summary"}
                      >
                        <Sparkles className="h-4 w-4" />
                        {generatingNarrative === "annual-summary" ? "Generating..." : "AI Insights"}
                      </Button>
                    </div>
                    
                    {narratives["annual-summary"] && (
                      <div className="mt-4 rounded-md border border-ledger bg-highlight p-4">
                        <p className="text-sm text-grey-dark whitespace-pre-wrap">{narratives["annual-summary"]}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            {/* Gift Aid Report */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink">Gift Aid Claim Report</CardTitle>
                <CardDescription className="text-grey-mid">
                  Calculate eligible Gift Aid claims with donor breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-grey-mid">Start Date</span>
                    <Input
                      type="date"
                      value={giftAidStart}
                      onChange={(e) => setGiftAidStart(e.target.value)}
                      className="font-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-grey-mid">End Date</span>
                    <Input
                      type="date"
                      value={giftAidEnd}
                      onChange={(e) => setGiftAidEnd(e.target.value)}
                      className="font-primary"
                    />
                  </label>
                </div>

                {giftAidReport && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm">Claimable Donations: {currency.format(giftAidReport.claimableAmount)}</p>
                      <p className="font-medium text-ink text-lg">Gift Aid Value (25%): {currency.format(giftAidReport.giftAidValue)}</p>
                      <p className="text-xs text-grey-mid">
                        {giftAidReport.transactionCount} transactions from {giftAidReport.donorBreakdown.length} donors
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="border-ledger font-primary"
                        onClick={() => handleExportReport("gift-aid", {
                          startDate: giftAidStart,
                          endDate: giftAidEnd
                        }, `gift-aid-${giftAidStart}-${giftAidEnd}.pdf`)}
                        disabled={loadingStates.giftAid}
                      >
                        {loadingStates.giftAid ? "Preparing..." : "Export PDF"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="border-ledger font-primary gap-2"
                        onClick={() => handleGenerateNarrative("gift-aid", giftAidReport)}
                        disabled={generatingNarrative === "gift-aid"}
                      >
                        <Sparkles className="h-4 w-4" />
                        {generatingNarrative === "gift-aid" ? "Generating..." : "AI Insights"}
                      </Button>
                    </div>
                    
                    {narratives["gift-aid"] && (
                      <div className="mt-4 rounded-md border border-ledger bg-highlight p-4">
                        <p className="text-sm text-grey-dark whitespace-pre-wrap">{narratives["gift-aid"]}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donors" className="space-y-6">
            {/* Tithes Statements */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink">Tithes Statements (General Fund)</CardTitle>
                <CardDescription className="text-grey-mid">
                  Generate donor statements for tithes and general fund donations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-grey-mid">From Date</span>
                    <Input
                      type="date"
                      value={statementStart}
                      onChange={(e) => setStatementStart(e.target.value)}
                      className="font-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-grey-mid">To Date</span>
                    <Input
                      type="date"
                      value={statementEnd}
                      onChange={(e) => setStatementEnd(e.target.value)}
                      className="font-primary"
                    />
                  </label>
                </div>

                <Button
                  variant="outline"
                  className="border-ledger font-primary"
                  onClick={() => handleExportReport("donor-statements", {
                    fromDate: statementStart,
                    toDate: statementEnd,
                    fundType: "general"
                  }, `tithes-statements-${statementStart}-${statementEnd}.pdf`)}
                  disabled={loadingStates.statements}
                >
                  {loadingStates.statements ? "Preparing..." : "Export Tithes Statements"}
                </Button>

                {tithesStatements && tithesStatements.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {tithesStatements.slice(0, 5).map((statement) => (
                      <div key={statement.donor._id} className="flex justify-between rounded-md border border-ledger px-3 py-2">
                        <div>
                          <p className="font-medium text-ink text-sm">{statement.donor.name}</p>
                          <p className="text-xs text-grey-mid">
                            {statement.transactions.length} gifts · {currency.format(statement.total)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {tithesStatements.length > 5 && (
                      <p className="text-xs text-grey-mid text-center py-1">
                        +{tithesStatements.length - 5} more donors
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-grey-mid">No donor statements for this period</p>
                )}
              </CardContent>
            </Card>

            {/* Building Fund Statements */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink">Building Fund Statements</CardTitle>
                <CardDescription className="text-grey-mid">
                  Generate donor statements for building fund (restricted) donations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-grey-mid">From Date</span>
                    <Input
                      type="date"
                      value={statementStart}
                      onChange={(e) => setStatementStart(e.target.value)}
                      className="font-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-wide text-grey-mid">To Date</span>
                    <Input
                      type="date"
                      value={statementEnd}
                      onChange={(e) => setStatementEnd(e.target.value)}
                      className="font-primary"
                    />
                  </label>
                </div>

                <Button
                  variant="outline"
                  className="border-ledger font-primary"
                  onClick={() => handleExportReport("donor-statements", {
                    fromDate: statementStart,
                    toDate: statementEnd,
                    fundType: "restricted"
                  }, `building-fund-statements-${statementStart}-${statementEnd}.pdf`)}
                  disabled={loadingStates.statements}
                >
                  {loadingStates.statements ? "Preparing..." : "Export Building Fund Statements"}
                </Button>

                {buildingFundStatements && buildingFundStatements.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {buildingFundStatements.slice(0, 5).map((statement) => (
                      <div key={statement.donor._id} className="flex justify-between rounded-md border border-ledger px-3 py-2">
                        <div>
                          <p className="font-medium text-ink text-sm">{statement.donor.name}</p>
                          <p className="text-xs text-grey-mid">
                            Building fund donations
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-grey-mid">No building fund donations for this period</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
