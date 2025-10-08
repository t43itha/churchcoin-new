"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileDown,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
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
import { api, type Id } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const FUND_COLORS = ["#0A5F38", "#1F7A50", "#319263", "#4AAD7A", "#6DC091", "#94D4AB"];

const formatPercentChange = (value: number) => {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 10) / 10;
  if (Number.isNaN(rounded)) return null;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
};

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

  const [expandedIncome, setExpandedIncome] = useState<Set<string>>(new Set());
  const [expandedExpenditure, setExpandedExpenditure] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [showCompletionBanner, setShowCompletionBanner] = useState(true);

  const selectedPeriod = useMemo(() => {
    if (!periods || !selectedPeriodId) return null;
    return periods.find((p) => p._id === selectedPeriodId) ?? null;
  }, [periods, selectedPeriodId]);

  const selectedPeriodName = selectedPeriod?.periodName ?? "";

  const { previousPeriodId, nextPeriodId } = useMemo(() => {
    if (!periods || !selectedPeriodId) {
      return { previousPeriodId: null as Id<"financialPeriods"> | null, nextPeriodId: null as Id<"financialPeriods"> | null };
    }

    const index = periods.findIndex((p) => p._id === selectedPeriodId);
    if (index === -1) {
      return { previousPeriodId: null, nextPeriodId: null };
    }

    const previous = periods[index + 1];
    const next = periods[index - 1];

    return {
      previousPeriodId: previous?._id ?? null,
      nextPeriodId: next?._id ?? null,
    };
  }, [periods, selectedPeriodId]);

  const previousOverview = useQuery(
    api.reports.getPeriodOverview,
    previousPeriodId ? { periodId: previousPeriodId } : "skip"
  );

  const handleToggleIncomeCategory = (id: string) => {
    setExpandedIncome((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleExpenditureCategory = (id: string) => {
    setExpandedExpenditure((prev) => {
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
          <AlertCircle className="mr-1 h-4 w-4" />
          OVERDUE{overdueDays ? ` (${overdueDays} days)` : ""}
        </Badge>
      );
    }

    if (period.status === "processing") {
      return (
        <Badge className="bg-highlight text-ink border-ledger font-primary">Processing</Badge>
      );
    }

    if (period.status === "completed") {
      return (
        <Badge className="bg-success/10 text-success border-success/20 font-primary">
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Completed
        </Badge>
      );
    }

    return (
      <Badge className="bg-grey-light text-grey-dark border-ledger font-primary">Draft</Badge>
    );
  };

  const quickInsights = useMemo(() => {
    const insights: { icon: React.ReactNode; title: string; description: string }[] = [];

    if (incomeReport?.mainCategories?.length) {
      const topIncome = [...incomeReport.mainCategories].sort((a, b) => b.total - a.total)[0];
      insights.push({
        icon: <TrendingPillIcon icon={<BarChart3 className="h-4 w-4" />} />,
        title: "Highest income category",
        description: `${topIncome.name} (${currency.format(topIncome.total)})`,
      });
    }

    if (expenditureReport?.mainCategories?.length) {
      const topExpense = [...expenditureReport.mainCategories].sort((a, b) => b.total - a.total)[0];
      insights.push({
        icon: <TrendingPillIcon icon={<AlertTriangle className="h-4 w-4" />} intent="warning" />,
        title: "Largest expense",
        description: `${topExpense.name} (${currency.format(topExpense.total)})`,
      });
    }

    if (weeklyReport?.weeklyData?.length) {
      const bestWeek = weeklyReport.weeklyData.reduce((acc, item) => (item.total > acc.total ? item : acc));
      insights.push({
        icon: <TrendingPillIcon icon={<LineChartIcon className="h-4 w-4" />} intent="success" />,
        title: "Best giving week",
        description: `${bestWeek.weekEnding} (${currency.format(bestWeek.total)})`,
      });
    }

    if (metrics) {
      insights.push({
        icon: <TrendingPillIcon icon={<Sparkles className="h-4 w-4" />} intent="muted" />,
        title: "Transactions reviewed",
        description: `${metrics.categorized}/${metrics.total} categorised (${metrics.percentComplete}%)`,
      });
    }

    return insights;
  }, [incomeReport, expenditureReport, weeklyReport, metrics]);

  const incomeDistribution = useMemo(() => {
    if (!incomeReport?.mainCategories?.length) return [];
    const total = incomeReport.totalIncome || incomeReport.mainCategories.reduce((sum, cat) => sum + cat.total, 0);
    return incomeReport.mainCategories.map((category, index) => ({
      id: category.id,
      name: category.name,
      value: category.total,
      percent: total > 0 ? (category.total / total) * 100 : 0,
      color: FUND_COLORS[index % FUND_COLORS.length],
      isRestricted: category.isRestricted,
    }));
  }, [incomeReport]);

  const expenditureByCategory = useMemo(() => {
    if (!expenditureReport?.mainCategories?.length) return [];
    return expenditureReport.mainCategories.map((category) => ({
      name: category.name,
      amount: category.total,
    }));
  }, [expenditureReport]);

  const weeklyTrendData = useMemo(() => {
    if (!weeklyReport?.weeklyData?.length) return [];
    return weeklyReport.weeklyData.map((week) => ({
      name: week.weekEnding,
      total: week.total,
      general: week.general,
      restricted: week.restricted,
    }));
  }, [weeklyReport]);

  const fundSegmentation = useMemo(() => {
    if (!overview) return null;
    const { general, restricted } = overview.fundSegregation;
    const total = general + restricted;
    return {
      general,
      restricted,
      generalPercent: total > 0 ? Math.round((general / total) * 100) : 0,
      restrictedPercent: total > 0 ? Math.round((restricted / total) * 100) : 0,
    };
  }, [overview]);

  const incomeVsExpenditureData = useMemo(() => {
    if (!overview) return [];
    return [
      {
        label: selectedPeriodName || "Current",
        income: overview.totalIncome,
        expenditure: overview.totalExpenditure,
      },
    ];
  }, [overview, selectedPeriodName]);

  const metricsCards = useMemo(() => {
    if (!overview) return [];

    const findPreviousPeriodName = () => {
      if (!previousPeriodId || !periods) return undefined;
      return periods.find((p) => p._id === previousPeriodId)?.periodName;
    };

    const computeTrend = (current?: number, previous?: number) => {
      if (current === undefined || previous === undefined || previous === 0) {
        return null;
      }
      return formatPercentChange(((current - previous) / previous) * 100);
    };

    const previousLabel = findPreviousPeriodName();

    return [
      {
        title: "Total Income",
        value: currency.format(overview.totalIncome),
        intent: "positive" as const,
        trend: computeTrend(overview.totalIncome, previousOverview?.totalIncome),
        context: previousLabel ? `vs ${previousLabel}` : undefined,
      },
      {
        title: "Total Expenditure",
        value: currency.format(overview.totalExpenditure),
        intent: "negative" as const,
        trend: computeTrend(overview.totalExpenditure, previousOverview?.totalExpenditure),
        context: previousLabel ? `vs ${previousLabel}` : undefined,
      },
      {
        title: "Net Position",
        value: currency.format(overview.netPosition),
        intent: "neutral" as const,
        trend: computeTrend(overview.netPosition, previousOverview?.netPosition),
        context: previousLabel ? `vs ${previousLabel}` : undefined,
      },
      metrics
        ? {
            title: "Completion",
            value: `${metrics.percentComplete}%`,
            intent: "muted" as const,
            trend: null,
            context:
              metrics.needsReview > 0
                ? `${metrics.needsReview} transactions need review`
                : "All transactions reviewed",
          }
        : null,
    ].filter(Boolean) as Array<{
      title: string;
      value: string;
      intent: "positive" | "negative" | "neutral" | "muted";
      trend: string | null;
      context?: string;
    }>;
  }, [overview, metrics, periods, previousOverview, previousPeriodId]);

  const showBanner = showCompletionBanner && period && metrics && period.status !== "completed";

  return (
    <div className="min-h-screen bg-paper pb-16">
      <header className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-semibold text-ink font-primary">Financial Reports</h1>
                  {getStatusBadge()}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-grey-mid font-primary">
                  <CalendarRange className="h-4 w-4" />
                  <span>
                    {period?.periodStart ? new Date(period.periodStart).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "--"}
                    {period?.periodEnd ? ` – ${new Date(period.periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 font-primary">
                <Button
                  variant="outline"
                  className="gap-2 border-ledger"
                  onClick={() => previousPeriodId && setSelectedPeriodId(previousPeriodId)}
                  disabled={!previousPeriodId}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous period
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-ledger"
                  onClick={() => nextPeriodId && setSelectedPeriodId(nextPeriodId)}
                  disabled={!nextPeriodId}
                >
                  Next period
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="border-ledger font-primary gap-2">
                  Compare periods
                </Button>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 lg:w-[280px]">
              <div className="space-y-1 font-primary">
                <span className="text-xs uppercase tracking-wide text-grey-mid">Period</span>
                <Select
                  value={selectedPeriodId ?? undefined}
                  onValueChange={(value) => setSelectedPeriodId(value as Id<"financialPeriods">)}
                >
                  <SelectTrigger className="w-full border-ledger">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods?.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.periodName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 font-primary">
                <span className="text-xs uppercase tracking-wide text-grey-mid">Active church</span>
                <Select
                  value={churchId ?? undefined}
                  onValueChange={(value) => setChurchId(value as Id<"churches">)}
                >
                  <SelectTrigger className="w-full border-ledger">
                    <SelectValue placeholder="Select church" />
                  </SelectTrigger>
                  <SelectContent>
                    {churches?.map((church) => (
                      <SelectItem key={church._id} value={church._id}>
                        {church.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {showBanner && (
            <div className="rounded-xl border border-ledger bg-highlight/60 p-4 font-primary">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 text-error" />
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Period not ready for completion
                    </p>
                    <p className="text-sm text-grey-mid">
                      {metrics.needsReview > 0
                        ? `${metrics.needsReview} transactions need review`
                        : "Complete outstanding tasks to close this period."}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="border-ledger font-primary">
                    Review queue
                  </Button>
                  <Button className="bg-ink text-paper font-primary">Mark complete</Button>
                  <Button
                    variant="ghost"
                    className="text-xs text-grey-mid hover:text-ink"
                    onClick={() => setShowCompletionBanner(false)}
                  >
                    Hide
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-grey-mid">
                  <span>
                    {metrics.categorized}/{metrics.total} categorised
                  </span>
                  <span>{metrics.percentComplete}%</span>
                </div>
                <div className="h-2 rounded-full bg-grey-light">
                  <div
                    className="h-full rounded-full bg-success transition-all"
                    style={{ width: `${metrics.percentComplete}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {metricsCards.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricsCards.map((card) => (
                <MetricCard key={card.title} {...card} />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="flex flex-wrap gap-2 font-primary">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenditure">Expenditure</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="review">Review queue</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink font-primary">Quick insights</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {quickInsights.length > 0 ? (
                  quickInsights.map((insight) => (
                    <div key={insight.title} className="flex items-start gap-3 rounded-lg border border-ledger/60 bg-paper p-4">
                      {insight.icon}
                      <div>
                        <p className="text-sm font-semibold text-ink font-primary">{insight.title}</p>
                        <p className="text-sm text-grey-mid font-primary">{insight.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-sm text-grey-mid font-primary">
                    Insights will appear once data is available for this period.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-5">
              <Card className="border-ledger bg-paper shadow-none xl:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-ink font-primary">Income vs expenditure</CardTitle>
                    <p className="text-sm text-grey-mid font-primary">
                      Compare the total income and expenditure for this period.
                    </p>
                  </div>
                  <BarChart3 className="hidden h-5 w-5 text-grey-mid xl:block" />
                </CardHeader>
                <CardContent className="h-[320px]">
                  {incomeVsExpenditureData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomeVsExpenditureData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E6" />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: "var(--font-primary)" }} />
                        <YAxis tick={{ fontSize: 12, fontFamily: "var(--font-primary)" }} tickFormatter={(value) => currency.format(value).replace("£", "£ ")} />
                        <Legend formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)} />
                        <RechartsTooltip formatter={(value: number) => currency.format(value)} labelFormatter={() => selectedPeriodName || "Current"} />
                        <Bar dataKey="income" name="Income" fill="#0A5F38" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="expenditure" name="Expenditure" fill="#8B0000" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No income or expenditure recorded for this period yet." />
                  )}
                </CardContent>
              </Card>

              <Card className="border-ledger bg-paper shadow-none xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-ink font-primary">Fund allocation</CardTitle>
                  <p className="text-sm text-grey-mid font-primary">
                    General vs restricted fund distribution.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fundSegmentation ? (
                    <div className="space-y-4">
                      <FundProgress
                        label="General funds"
                        amount={currency.format(fundSegmentation.general)}
                        percentage={fundSegmentation.generalPercent}
                        tone="neutral"
                      />
                      <FundProgress
                        label="Restricted funds"
                        amount={currency.format(fundSegmentation.restricted)}
                        percentage={fundSegmentation.restrictedPercent}
                        tone="alert"
                      />
                    </div>
                  ) : (
                    <EmptyState message="Fund allocation will appear when income is recorded." />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink font-primary">Reconciliation summary</CardTitle>
                <p className="text-sm text-grey-mid font-primary">
                  Bank and cash balances by fund type.
                </p>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-2">
                {overview ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-grey-mid font-primary">
                        General / unrestricted funds
                      </h3>
                      <div className="overflow-hidden rounded-lg border border-ledger">
                        <FundTable
                          headings={["Category", "Bank", "Cash", "Total"]}
                          rows={overview.generalBreakdown.categories.map((category) => ({
                            id: category.categoryId,
                            columns: [
                              category.categoryName,
                              currency.format(category.bankAmount),
                              currency.format(category.cashAmount),
                              currency.format(category.combinedTotal),
                            ],
                          }))}
                          footerLabel="Subtotal general funds"
                          footerValues={[
                            currency.format(overview.generalBreakdown.subtotal.bankAmount),
                            currency.format(overview.generalBreakdown.subtotal.cashAmount),
                            currency.format(overview.generalBreakdown.subtotal.combinedTotal),
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState message="Reconciliation data will appear when transactions are available." />
                )}

                {overview && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-grey-mid font-primary">
                      Restricted funds (ring-fenced)
                    </h3>
                    <div className="overflow-hidden rounded-lg border border-ledger">
                      <FundTable
                        headings={["Fund", "Bank", "Cash", "Total"]}
                        rows={overview.restrictedBreakdown.funds.map((fund) => ({
                          id: fund.fundId,
                          columns: [
                            fund.fundName,
                            currency.format(fund.bankAmount),
                            currency.format(fund.cashAmount),
                            currency.format(fund.combinedTotal),
                          ],
                        }))}
                        footerLabel="Subtotal restricted funds"
                        footerValues={[
                          currency.format(overview.restrictedBreakdown.subtotal.bankAmount),
                          currency.format(overview.restrictedBreakdown.subtotal.cashAmount),
                          currency.format(overview.restrictedBreakdown.subtotal.combinedTotal),
                        ]}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income" className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="border-ledger bg-paper shadow-none lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-ink font-primary">Income distribution</CardTitle>
                    <p className="text-sm text-grey-mid font-primary">
                      Share of income by top-level category.
                    </p>
                  </div>
                  <PieChartIcon className="hidden h-5 w-5 text-grey-mid lg:block" />
                </CardHeader>
                <CardContent className="h-[320px]">
                  {incomeDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomeDistribution}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {incomeDistribution.map((entry) => (
                            <Cell key={entry.id} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => currency.format(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="Income categories will populate as transactions are recorded." />
                  )}
                </CardContent>
              </Card>

              <Card className="border-ledger bg-paper shadow-none lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-ink font-primary">Income by category</CardTitle>
                  <p className="text-sm text-grey-mid font-primary">
                    Expand categories to view detailed breakdowns.
                  </p>
                </CardHeader>
                <CardContent>
                  {incomeReport && incomeReport.mainCategories.length > 0 ? (
                    <div className="space-y-3">
                      {incomeReport.mainCategories.map((mainCat) => (
                        <div key={mainCat.id} className="rounded-lg border border-ledger">
                          <button
                            onClick={() => handleToggleIncomeCategory(mainCat.id)}
                            className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-highlight transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {expandedIncome.has(mainCat.id) ? (
                                <ChevronDown className="h-4 w-4 text-grey-mid" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-grey-mid" />
                              )}
                              <span className="font-medium text-ink font-primary">
                                {mainCat.name}
                                {mainCat.isRestricted && (
                                  <Badge className="ml-2 text-xs bg-error/10 text-error border-error/20">
                                    Restricted
                                  </Badge>
                                )}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-ink font-primary">
                              {currency.format(mainCat.total)}
                            </span>
                          </button>

                          {expandedIncome.has(mainCat.id) && mainCat.subcategories.length > 0 && (
                            <div className="border-t border-ledger bg-highlight">
                              {mainCat.subcategories.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex justify-between gap-4 px-4 py-2 pl-12 text-sm font-primary"
                                >
                                  <span className="text-grey-dark">{sub.name}</span>
                                  <span className="text-ink">{currency.format(sub.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="flex items-center justify-between border-t border-ledger pt-4 font-primary">
                        <span className="text-lg font-bold text-ink">Total income</span>
                        <span className="text-2xl font-bold text-success">
                          {currency.format(incomeReport.totalIncome)}
                        </span>
                      </div>

                      <Button variant="outline" className="mt-4 w-full gap-2 border-ledger font-primary">
                        <FileDown className="h-4 w-4" />
                        Export income report
                      </Button>
                    </div>
                  ) : (
                    <EmptyState message="No income transactions for this period." />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenditure" className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="border-ledger bg-paper shadow-none lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-ink font-primary">Expense breakdown</CardTitle>
                    <p className="text-sm text-grey-mid font-primary">
                      Comparison of spending by category.
                    </p>
                  </div>
                  <BarChart3 className="hidden h-5 w-5 text-grey-mid lg:block" />
                </CardHeader>
                <CardContent className="h-[320px]">
                  {expenditureByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenditureByCategory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E6" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "var(--font-primary)" }} interval={0} angle={-20} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12, fontFamily: "var(--font-primary)" }} tickFormatter={(value) => currency.format(value)} />
                        <RechartsTooltip formatter={(value: number) => currency.format(value)} />
                        <Bar dataKey="amount" fill="#8B0000" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="Expense data will appear once transactions are recorded." />
                  )}
                </CardContent>
              </Card>

              <Card className="border-ledger bg-paper shadow-none lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-ink font-primary">Expenditure by category</CardTitle>
                  <p className="text-sm text-grey-mid font-primary">
                    Expand categories to view detailed breakdowns.
                  </p>
                </CardHeader>
                <CardContent>
                  {expenditureReport && expenditureReport.mainCategories.length > 0 ? (
                    <div className="space-y-3">
                      {expenditureReport.mainCategories.map((mainCat) => (
                        <div key={mainCat.id} className="rounded-lg border border-ledger">
                          <button
                            onClick={() => handleToggleExpenditureCategory(mainCat.id)}
                            className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-highlight"
                          >
                            <div className="flex items-center gap-2">
                              {expandedExpenditure.has(mainCat.id) ? (
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

                          {expandedExpenditure.has(mainCat.id) && mainCat.subcategories.length > 0 && (
                            <div className="border-t border-ledger bg-highlight">
                              {mainCat.subcategories.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex justify-between gap-4 px-4 py-2 pl-12 text-sm font-primary"
                                >
                                  <span className="text-grey-dark">{sub.name}</span>
                                  <span className="text-ink">{currency.format(sub.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="flex items-center justify-between border-t border-ledger pt-4 font-primary">
                        <span className="text-lg font-bold text-ink">Total expenditure</span>
                        <span className="text-2xl font-bold text-error">
                          {currency.format(expenditureReport.totalExpenditure)}
                        </span>
                      </div>

                      <Button variant="outline" className="mt-4 w-full gap-2 border-ledger font-primary">
                        <FileDown className="h-4 w-4" />
                        Export expenditure report
                      </Button>
                    </div>
                  ) : (
                    <EmptyState message="No expenditure transactions for this period." />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-8">
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-ink font-primary">Weekly giving trend</CardTitle>
                  <p className="text-sm text-grey-mid font-primary">
                    Sunday week-ending totals split by fund type.
                  </p>
                </div>
                <LineChartIcon className="hidden h-5 w-5 text-grey-mid lg:block" />
              </CardHeader>
              <CardContent className="h-[320px]">
                {weeklyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E6" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "var(--font-primary)" }} />
                      <YAxis tick={{ fontSize: 12, fontFamily: "var(--font-primary)" }} tickFormatter={(value) => currency.format(value)} />
                      <Legend />
                      <RechartsTooltip formatter={(value: number) => currency.format(value)} />
                      <Line type="monotone" dataKey="general" stroke="#0A5F38" strokeWidth={2} dot={{ r: 2 }} name="General" />
                      <Line type="monotone" dataKey="restricted" stroke="#8B0000" strokeWidth={2} dot={{ r: 2 }} name="Restricted" />
                      <Line type="monotone" dataKey="total" stroke="#1F1F1F" strokeWidth={3} dot={{ r: 3 }} name="Total" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="Weekly trend data will populate when income has been recorded." />
                )}
              </CardContent>
            </Card>

            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader>
                <CardTitle className="text-ink font-primary">Weekly breakdown</CardTitle>
                <p className="text-sm text-grey-mid font-primary">
                  Tap a week to view category breakdowns.
                </p>
              </CardHeader>
              <CardContent>
                {weeklyReport && weeklyReport.weeklyData.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-ledger">
                    <table className="w-full font-primary text-sm">
                      <thead className="bg-ledger text-grey-dark">
                        <tr>
                          <th className="px-4 py-3 text-left">Week ending</th>
                          <th className="px-4 py-3 text-right">General</th>
                          <th className="px-4 py-3 text-right">Restricted</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyReport.weeklyData.map((week) => (
                          <React.Fragment key={week.weekEnding}>
                            <tr
                              className="cursor-pointer border-t border-ledger transition-colors hover:bg-highlight"
                              onClick={() => toggleWeek(week.weekEnding)}
                            >
                              <td className="px-4 py-3 text-ink">{week.weekEnding}</td>
                              <td className="px-4 py-3 text-right text-ink">
                                {currency.format(week.general)}
                              </td>
                              <td className="px-4 py-3 text-right text-ink">
                                {currency.format(week.restricted)}
                              </td>
                              <td className="px-4 py-3 text-right text-ink font-medium">
                                {currency.format(week.total)}
                              </td>
                            </tr>
                            {expandedWeeks.has(week.weekEnding) && week.breakdown.length > 0 && (
                              <tr className="bg-highlight">
                                <td colSpan={4} className="px-6 py-4">
                                  <div className="space-y-1 text-xs text-grey-mid">
                                    {week.breakdown.map((item, idx) => (
                                      <div key={`${item.category}-${idx}`} className="flex justify-between">
                                        <span>
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
                      </tbody>
                      <tfoot className="bg-ledger/80 text-ink">
                        <tr>
                          <td className="px-4 py-3 font-semibold uppercase">Total</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {currency.format(weeklyReport.totals.general)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {currency.format(weeklyReport.totals.restricted)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {currency.format(weeklyReport.totals.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <EmptyState message="No weekly data available for this period." />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review" className="space-y-8">
            <Card className="border-ledger bg-paper shadow-none">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-ink font-primary">Review queue</CardTitle>
                  <p className="text-sm text-grey-mid font-primary">
                    {reviewQueue?.length ?? 0} transactions need attention
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-2 border-ledger font-primary" disabled>
                    <Sparkles className="h-4 w-4" />
                    Auto-categorise (coming soon)
                  </Button>
                  <Button className="bg-ink text-paper font-primary">Go to transactions</Button>
                </div>
              </CardHeader>
              <CardContent>
                {reviewQueue && reviewQueue.length > 0 ? (
                  <div className="space-y-3">
                    {reviewQueue.map((tx) => (
                      <div key={tx._id} className="rounded-lg border border-ledger p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-ink font-primary">{tx.description}</p>
                            <p className="text-sm text-grey-mid font-primary">
                              {tx.date} • {currency.format(tx.amount)}
                            </p>
                          </div>
                          <Badge className="bg-error/10 text-error border-error/20 font-primary text-xs">
                            Needs review
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-grey-mid font-primary">
                          Inline categorisation tools will appear here to help complete the period.
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-ledger bg-highlight/40 p-8 text-center font-primary">
                    <CheckCircle2 className="mx-auto mb-3 h-6 w-6 text-success" />
                    <p className="font-medium text-ink">All transactions are categorised</p>
                    <p className="mt-1 text-sm text-grey-mid">
                      This period is ready to be marked complete.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-sm font-primary md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-grey-mid">
            <FileDown className="h-4 w-4" />
            <span>Need an export? Generate a full report package.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2 border-ledger font-primary">
              <FileDown className="h-4 w-4" />
              Export all
            </Button>
            <Button variant="outline" className="gap-2 border-ledger font-primary">
              <FileDown className="h-4 w-4" />
              Print-ready PDF
            </Button>
            <Button className="bg-ink text-paper font-primary">Mark period complete</Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({
  title,
  value,
  trend,
  context,
  intent,
}: {
  title: string;
  value: string;
  trend: string | null;
  context?: string;
  intent: "positive" | "negative" | "neutral" | "muted";
}) {
  const trendColour =
    intent === "positive"
      ? "text-success"
      : intent === "negative"
      ? "text-error"
      : "text-ink";

  return (
    <div className="rounded-xl border border-ledger bg-paper p-5 font-primary shadow-sm">
      <p className="text-xs uppercase tracking-wide text-grey-mid">{title}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-ink">{value}</span>
        {trend && <span className={`text-xs font-medium ${trendColour}`}>{trend}</span>}
      </div>
      {context && <p className="mt-2 text-xs text-grey-mid">{context}</p>}
    </div>
  );
}

function FundProgress({
  label,
  amount,
  percentage,
  tone,
}: {
  label: string;
  amount: string;
  percentage: number;
  tone: "neutral" | "alert";
}) {
  const barClass = tone === "alert" ? "bg-error" : "bg-ink";

  return (
    <div className="space-y-2 font-primary">
      <div className="flex items-center justify-between text-sm text-ink">
        <span>{label}</span>
        <span>
          {amount} ({percentage}%)
        </span>
      </div>
      <div className="h-3 rounded-full bg-grey-light">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
}

function FundTable({
  headings,
  rows,
  footerLabel,
  footerValues,
}: {
  headings: string[];
  rows: { id: string; columns: string[] }[];
  footerLabel: string;
  footerValues: string[];
}) {
  return (
    <table className="w-full text-sm font-primary">
      <thead className="bg-ledger text-grey-dark">
        <tr>
          {headings.map((heading, index) => (
            <th
              key={heading}
              className={`px-4 py-3 ${index === 0 ? "text-left" : "text-right"}`}
            >
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-ledger text-ink">
            {row.columns.map((column, index) => (
              <td
                key={`${row.id}-${index}`}
                className={`px-4 py-3 ${index === 0 ? "text-left" : "text-right"}`}
              >
                {column}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-ledger/80 text-ink">
        <tr>
          <td className="px-4 py-3 text-left font-semibold uppercase">{footerLabel}</td>
          {footerValues.map((value, index) => (
            <td key={`${footerLabel}-${index}`} className="px-4 py-3 text-right font-semibold">
              {value}
            </td>
          ))}
        </tr>
      </tfoot>
    </table>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ledger/70 bg-paper/60 text-center font-primary">
      <FileDown className="h-6 w-6 text-grey-mid" />
      <p className="text-sm text-grey-mid">{message}</p>
    </div>
  );
}

function TrendingPillIcon({
  icon,
  intent = "success",
}: {
  icon: React.ReactNode;
  intent?: "success" | "warning" | "muted";
}) {
  const className =
    intent === "warning"
      ? "bg-error/10 text-error"
      : intent === "muted"
      ? "bg-ledger text-grey-dark"
      : "bg-success/10 text-success";

  return (
    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${className}`}>
      {icon}
    </span>
  );
}
