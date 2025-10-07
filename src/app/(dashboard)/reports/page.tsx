"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { AlertCircle, ChevronDown, ChevronRight, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api, type Id } from "@/lib/convexGenerated";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export default function ReportsPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  const currentPeriod = useQuery(
    api.financialPeriods.getCurrentPeriod,
    churchId ? { churchId } : "skip"
  );

  const periods = useQuery(
    api.financialPeriods.listPeriods,
    churchId ? { churchId } : "skip"
  );

  const [selectedPeriodId, setSelectedPeriodId] = useState<Id<"financialPeriods"> | null>(null);

  useEffect(() => {
    if (!selectedPeriodId && currentPeriod) {
      setSelectedPeriodId(currentPeriod._id);
    }
  }, [currentPeriod, selectedPeriodId]);

  const period = useQuery(
    api.financialPeriods.getPeriod,
    selectedPeriodId ? { periodId: selectedPeriodId } : "skip"
  );

  const metrics = useQuery(
    api.financialPeriods.getPeriodMetrics,
    selectedPeriodId ? { periodId: selectedPeriodId } : "skip"
  );

  const overview = useQuery(
    api.reports.getPeriodOverview,
    selectedPeriodId ? { periodId: selectedPeriodId } : "skip"
  );

  const incomeReport = useQuery(
    api.reports.getHierarchicalIncomeReport,
    selectedPeriodId ? { periodId: selectedPeriodId } : "skip"
  );

  const expenditureReport = useQuery(
    api.reports.getHierarchicalExpenditureReport,
    selectedPeriodId ? { periodId: selectedPeriodId } : "skip"
  );

  const weeklyReport = useQuery(
    api.reports.getWeeklySummaryReport,
    selectedPeriodId ? { periodId: selectedPeriodId } : "skip"
  );

  const reviewQueue = useQuery(
    api.reports.getReviewQueue,
    selectedPeriodId ? { periodId: selectedPeriodId } : "skip"
  );

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleWeek = (weekEnding: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekEnding)) {
        next.delete(weekEnding);
      } else {
        next.add(weekEnding);
      }
      return next;
    });
  };

  const getStatusBadge = () => {
    if (!period) return null;

    if (period.status === "overdue") {
      const overdueDays = currentPeriod?.overdueDays ?? 0;
      return (
        <Badge className="bg-error/10 text-error border-error/20 font-primary">
          <AlertCircle className="h-4 w-4 mr-1" />
          OVERDUE ({overdueDays} days)
        </Badge>
      );
    }

    if (period.status === "processing") {
      return (
        <Badge className="bg-highlight text-ink border-ledger font-primary">
          Processing
        </Badge>
      );
    }

    if (period.status === "completed") {
      return (
        <Badge className="bg-success/10 text-success border-success/20 font-primary">
          Completed
        </Badge>
      );
    }

    return (
      <Badge className="bg-grey-light text-grey-dark border-ledger font-primary">
        Draft
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-paper pb-12">
      {/* Header with Period Selector */}
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-ink font-primary">
                Financial Reports
              </h1>
              <div className="flex items-center gap-4">
                <Select
                  value={selectedPeriodId ?? undefined}
                  onValueChange={(value) => setSelectedPeriodId(value as Id<"financialPeriods">)}
                >
                  <SelectTrigger className="w-[240px] font-primary border-ledger">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent className="font-primary">
                    {periods?.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.periodName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getStatusBadge()}
              </div>
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <span className="text-xs uppercase tracking-wide text-grey-mid">Active church</span>
              <Select
                value={churchId ?? undefined}
                onValueChange={(value) => setChurchId(value as Id<"churches">)}
              >
                <SelectTrigger className="w-[240px] font-primary border-ledger">
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

          {/* Progress Bar */}
          {metrics && period && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-primary text-grey-mid">
                <span>
                  Progress: {metrics.categorized}/{metrics.total} categorized
                </span>
                <span>{metrics.percentComplete}%</span>
              </div>
              <div className="h-2 bg-grey-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all"
                  style={{ width: `${metrics.percentComplete}%` }}
                />
              </div>
              {metrics.needsReview > 0 && (
                <p className="text-sm text-grey-mid font-primary">
                  {metrics.needsReview} transactions need review
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="font-primary">
            <TabsTrigger value="overview">Overview & Reconciliation</TabsTrigger>
            <TabsTrigger value="income">Income & Weekly</TabsTrigger>
            <TabsTrigger value="expenditure">Expenditure</TabsTrigger>
            <TabsTrigger value="review">Review Queue</TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview & Reconciliation */}
          <TabsContent value="overview" className="space-y-6">
            {/* Section 1: Period Overview */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink font-primary">Period Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {overview && (
                  <>
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 border border-ledger rounded-lg">
                        <div className="text-sm text-grey-mid font-primary">Total Income</div>
                        <div className="text-2xl font-bold text-success font-primary">
                          {currency.format(overview.totalIncome)}
                        </div>
                      </div>
                      <div className="p-4 border border-ledger rounded-lg">
                        <div className="text-sm text-grey-mid font-primary">Total Expenditure</div>
                        <div className="text-2xl font-bold text-error font-primary">
                          {currency.format(overview.totalExpenditure)}
                        </div>
                      </div>
                      <div className="p-4 border border-ledger rounded-lg">
                        <div className="text-sm text-grey-mid font-primary">Net Position</div>
                        <div className="text-2xl font-bold text-ink font-primary">
                          {currency.format(overview.netPosition)}
                        </div>
                      </div>
                    </div>

                    {/* Fund Segregation */}
                    <div className="border-t border-ledger pt-4">
                      <h3 className="text-sm font-medium text-grey-mid font-primary mb-3">
                        Fund Segregation
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between font-primary">
                          <span className="text-ink">General/Unrestricted</span>
                          <span className="text-ink font-medium">
                            {currency.format(overview.fundSegregation.general)}
                          </span>
                        </div>
                        <div className="flex justify-between font-primary">
                          <span className="text-ink font-bold">Restricted Funds (Total)</span>
                          <span className="text-ink font-bold">
                            {currency.format(overview.fundSegregation.restricted)}
                          </span>
                        </div>

                        {/* Individual Restricted Funds Breakdown */}
                        {overview.restrictedFunds && overview.restrictedFunds.length > 0 && (
                          <div className="pl-4 space-y-1 border-l-2 border-ledger ml-2">
                            {overview.restrictedFunds.map((fund) => (
                              <div key={fund.fundId} className="flex justify-between font-primary text-sm">
                                <span className="text-grey-dark">{fund.fundName}</span>
                                <span className="text-ink font-medium">
                                  {currency.format(fund.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between font-primary text-grey-mid text-sm pt-2 border-t border-ledger">
                          <span>Uncategorised (excluded)</span>
                          <span>{currency.format(overview.fundSegregation.uncategorised)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="border-ledger font-primary gap-2">
                        <FileDown className="h-4 w-4" />
                        Export All Reports (ZIP)
                      </Button>
                      <Button className="bg-ink text-paper font-primary">
                        Mark Period Complete
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Section 2: Reconciliation */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink font-primary">Bank vs Cash Reconciliation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-grey-mid font-primary mb-4">
                  Reconciliation view coming soon. This will show Bank vs Cash breakdown with General and Restricted fund segregation.
                </p>
                <Button variant="outline" className="w-full border-ledger font-primary gap-2">
                  <FileDown className="h-4 w-4" />
                  Export Reconciliation Report
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Income & Weekly */}
          <TabsContent value="income" className="space-y-6">
            {/* Section 1: Hierarchical Income */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink font-primary">Income by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeReport && incomeReport.mainCategories.length > 0 ? (
                  <div className="space-y-3">
                    {incomeReport.mainCategories.map((mainCat) => (
                      <div key={mainCat.id} className="border border-ledger rounded-lg">
                        <button
                          onClick={() => toggleCategory(mainCat.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-highlight transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {expandedCategories.has(mainCat.id) ? (
                              <ChevronDown className="h-4 w-4 text-grey-mid" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-grey-mid" />
                            )}
                            <span className="font-medium text-ink font-primary">
                              {mainCat.name}
                              {mainCat.isRestricted && (
                                <Badge className="ml-2 text-xs bg-error/10 text-error border-error/20">
                                  R
                                </Badge>
                              )}
                            </span>
                          </div>
                          <span className="text-lg font-bold text-ink font-primary">
                            {currency.format(mainCat.total)}
                          </span>
                        </button>

                        {expandedCategories.has(mainCat.id) && mainCat.subcategories.length > 0 && (
                          <div className="border-t border-ledger bg-highlight">
                            {mainCat.subcategories.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex justify-between px-4 py-2 pl-12 border-b border-ledger/50 last:border-b-0"
                              >
                                <span className="text-sm text-grey-dark font-primary">{sub.name}</span>
                                <span className="text-sm text-ink font-primary">
                                  {currency.format(sub.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-4 border-t border-ledger">
                      <span className="text-lg font-bold text-ink font-primary">Total Income</span>
                      <span className="text-2xl font-bold text-success font-primary">
                        {currency.format(incomeReport.totalIncome)}
                      </span>
                    </div>

                    <Button variant="outline" className="w-full mt-4 border-ledger font-primary gap-2">
                      <FileDown className="h-4 w-4" />
                      Export Income Report
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-grey-mid font-primary text-center py-6">
                    No income transactions for this period
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Section 2: Weekly Breakdown */}
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink font-primary">Weekly Breakdown</CardTitle>
                <p className="text-sm text-grey-mid font-primary">
                  Sunday week-endings with fund segregation
                </p>
              </CardHeader>
              <CardContent>
                {weeklyReport && weeklyReport.weeklyData.length > 0 ? (
                  <div>
                    <div className="bg-paper border border-ledger rounded-lg overflow-hidden">
                      <table className="w-full font-primary text-sm">
                        <thead className="bg-ledger">
                          <tr>
                            <th className="px-4 py-3 text-left text-grey-dark">Week Ending</th>
                            <th className="px-4 py-3 text-right text-grey-dark">General (G)</th>
                            <th className="px-4 py-3 text-right text-grey-dark">Restricted (R)</th>
                            <th className="px-4 py-3 text-right text-grey-dark">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyReport.weeklyData.map((week) => (
                            <React.Fragment key={week.weekEnding}>
                              <tr
                                className="border-b border-ledger hover:bg-highlight cursor-pointer"
                                onClick={() => toggleWeek(week.weekEnding)}
                              >
                                <td className="px-4 py-2 text-ink">{week.weekEnding}</td>
                                <td className="px-4 py-2 text-right text-ink">
                                  {currency.format(week.general)}
                                </td>
                                <td className="px-4 py-2 text-right text-ink">
                                  {currency.format(week.restricted)}
                                </td>
                                <td className="px-4 py-2 text-right text-ink font-medium">
                                  {currency.format(week.total)}
                                </td>
                              </tr>

                              {expandedWeeks.has(week.weekEnding) && week.breakdown.length > 0 && (
                                <tr className="bg-highlight">
                                  <td colSpan={4} className="px-4 py-3">
                                    <div className="space-y-1 text-xs pl-6">
                                      {week.breakdown.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                          <span className="text-grey-dark">
                                            {item.category} ({item.fundType})
                                          </span>
                                          <span className="text-ink">{currency.format(item.amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                          <tr className="bg-ledger border-t-2 border-ink">
                            <td className="px-4 py-3 text-ink font-bold">TOTAL</td>
                            <td className="px-4 py-3 text-right text-ink font-bold">
                              {currency.format(weeklyReport.totals.general)}
                            </td>
                            <td className="px-4 py-3 text-right text-ink font-bold">
                              {currency.format(weeklyReport.totals.restricted)}
                            </td>
                            <td className="px-4 py-3 text-right text-ink font-bold">
                              {currency.format(weeklyReport.totals.total)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" className="flex-1 border-ledger font-primary gap-2">
                        <FileDown className="h-4 w-4" />
                        Export Weekly Summary
                      </Button>
                      <Button variant="outline" className="flex-1 border-ledger font-primary gap-2">
                        <FileDown className="h-4 w-4" />
                        Export All CSV Reports
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-grey-mid font-primary text-center py-6">
                    No weekly data for this period
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Expenditure */}
          <TabsContent value="expenditure" className="space-y-6">
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink font-primary">Expenditure by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {expenditureReport && expenditureReport.mainCategories.length > 0 ? (
                  <div className="space-y-3">
                    {expenditureReport.mainCategories.map((mainCat) => (
                      <div key={mainCat.id} className="border border-ledger rounded-lg">
                        <button
                          onClick={() => toggleCategory(mainCat.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-highlight transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {expandedCategories.has(mainCat.id) ? (
                              <ChevronDown className="h-4 w-4 text-grey-mid" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-grey-mid" />
                            )}
                            <span className="font-medium text-ink font-primary">{mainCat.name}</span>
                          </div>
                          <span className="text-lg font-bold text-error font-primary">
                            {currency.format(mainCat.total)}
                          </span>
                        </button>

                        {expandedCategories.has(mainCat.id) && mainCat.subcategories.length > 0 && (
                          <div className="border-t border-ledger bg-highlight">
                            {mainCat.subcategories.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex justify-between px-4 py-2 pl-12 border-b border-ledger/50 last:border-b-0"
                              >
                                <span className="text-sm text-grey-dark font-primary">{sub.name}</span>
                                <span className="text-sm text-ink font-primary">
                                  {currency.format(sub.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-4 border-t border-ledger">
                      <span className="text-lg font-bold text-ink font-primary">Total Expenditure</span>
                      <span className="text-2xl font-bold text-error font-primary">
                        {currency.format(expenditureReport.totalExpenditure)}
                      </span>
                    </div>

                    <Button variant="outline" className="w-full mt-4 border-ledger font-primary gap-2">
                      <FileDown className="h-4 w-4" />
                      Export Expenditure Report
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-grey-mid font-primary text-center py-6">
                    No expenditure transactions for this period
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Review Queue */}
          <TabsContent value="review" className="space-y-6">
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink font-primary">Transactions Needing Review</CardTitle>
                <p className="text-sm text-grey-mid font-primary">
                  {reviewQueue?.length ?? 0} transactions require your attention
                </p>
              </CardHeader>
              <CardContent>
                {reviewQueue && reviewQueue.length > 0 ? (
                  <div className="space-y-3">
                    {reviewQueue.map((tx) => (
                      <div key={tx._id} className="border border-ledger rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-ink font-primary">{tx.description}</div>
                            <div className="text-sm text-grey-mid font-primary">
                              {tx.date} • {currency.format(tx.amount)}
                            </div>
                          </div>
                          <Badge className="bg-error/10 text-error border-error/20 font-primary text-xs">
                            Uncategorised
                          </Badge>
                        </div>
                        <p className="text-xs text-grey-mid font-primary">
                          Transaction categorization interface coming soon
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-grey-mid font-primary text-center py-6">
                    All transactions are categorized! 🎉
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
