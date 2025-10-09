"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import {
  ArrowDownRight,
  BarChart3,
  Calendar,
  ChevronRight,
  Church,
  Layers,
  Plus,
  Receipt,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatUkDateNumeric } from "@/lib/dates";
import { InsightsWidget } from "@/components/ai/insights-widget";
import {
  KpiCard,
  type KpiDelta,
  type TrendPoint,
  type KpiCardProps,
} from "@/components/dashboard/kpi-card";
import {
  PeriodSelector,
  type PeriodOption,
} from "@/components/dashboard/period-selector";
import { api, type Doc, type Id } from "@/lib/convexGenerated";

interface DateRangeResult {
  start: Date;
  end: Date;
  comparisonStart: Date;
  comparisonEnd: Date;
  label: string;
  comparisonLabel: string;
}

type PeriodKey =
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "this-year"
  | "ytd";

type DashboardKpi = {
  key: string;
} & Pick<
  KpiCardProps,
  "title" | "value" | "subtitle" | "delta" | "sparkline" | "status"
>;

const PERIOD_OPTIONS: PeriodOption[] = [
  { id: "this-month", label: "This Month", shortcut: "M" },
  { id: "last-month", label: "Last Month", shortcut: "LM" },
  { id: "this-quarter", label: "This Quarter", shortcut: "Q" },
  { id: "this-year", label: "This Year", shortcut: "Y" },
  { id: "ytd", label: "Year to Date", shortcut: "YTD" },
];

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function buildRange(option: PeriodKey, anchor: Date): DateRangeResult {
  const base = new Date(anchor);
  let start = startOfMonth(base);
  let end = endOfMonth(base);
  let comparisonStart = startOfMonth(
    new Date(start.getFullYear(), start.getMonth() - 1, 1)
  );
  let comparisonEnd = endOfMonth(
    new Date(end.getFullYear(), end.getMonth() - 1, 1)
  );

  if (option === "last-month") {
    start = startOfMonth(new Date(base.getFullYear(), base.getMonth() - 1, 1));
    end = endOfMonth(start);
    comparisonStart = startOfMonth(
      new Date(start.getFullYear(), start.getMonth() - 1, 1)
    );
    comparisonEnd = endOfMonth(comparisonStart);
  }

  if (option === "this-quarter") {
    const quarter = Math.floor(base.getMonth() / 3);
    start = new Date(base.getFullYear(), quarter * 3, 1);
    end = endOfMonth(new Date(base.getFullYear(), quarter * 3 + 2, 1));
    comparisonStart = new Date(start.getFullYear(), start.getMonth() - 3, 1);
    comparisonEnd = endOfMonth(
      new Date(end.getFullYear(), end.getMonth() - 3, 1)
    );
  }

  if (option === "this-year" || option === "ytd") {
    start = new Date(base.getFullYear(), 0, 1);
    if (option === "this-year") {
      end = new Date(base.getFullYear(), 11, 31);
    } else {
      end = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    }
    comparisonStart = new Date(start.getFullYear() - 1, 0, 1);
    comparisonEnd = new Date(start.getFullYear() - 1, end.getMonth(), end.getDate());
  }

  const label = `${start.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  })} - ${end.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const comparisonLabel = `${comparisonStart.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  })} - ${comparisonEnd.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return { start, end, comparisonStart, comparisonEnd, label, comparisonLabel };
}

function formatCurrency(value: number) {
  return currency.format(value ?? 0);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calculatePercentageChange(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("this-month");
  const [showGrowthMetrics, setShowGrowthMetrics] = useState(false);
  const [periodOffset, setPeriodOffset] = useState(0);

  const churches = useQuery(api.churches.listChurches, {});
  const churchId = churches?.[0]?._id;

  const funds = useQuery(api.funds.list);
  const categories = useQuery(
    api.categories.getCategories,
    churchId ? { churchId } : "skip"
  );
  const donors = useQuery(
    api.donors.getDonors,
    churchId ? { churchId } : "skip"
  );
  const recentTransactions = useQuery(api.transactions.getRecent, { limit: 25 });
  const totalFunds = useQuery(api.funds.getTotalBalance);
  const generateInsights = useMutation(api.aiInsights.generateInsights);

  const currentPeriod = useQuery(
    api.financialPeriods.getCurrentPeriod,
    churchId ? { churchId } : "skip"
  );
  const periodMetrics = useQuery(
    api.financialPeriods.getPeriodMetrics,
    currentPeriod?._id ? { periodId: currentPeriod._id } : "skip"
  );
  const periodHistory = useQuery(
    api.financialPeriods.listPeriods,
    churchId ? { churchId } : "skip"
  );

  const periodAnchor = useMemo(() => {
    if (!currentPeriod) return new Date();
    const base = new Date(currentPeriod.year, currentPeriod.month - 1, 1);
    base.setMonth(base.getMonth() + periodOffset);
    return base;
  }, [currentPeriod, periodOffset]);

  const dateRange = useMemo(
    () => buildRange(selectedPeriod, periodAnchor),
    [selectedPeriod, periodAnchor]
  );

  const incomeExpenseArgs = useMemo(() => {
    if (!churchId || !dateRange) return "skip" as const;
    return {
      churchId,
      startDate: isoDate(dateRange.start),
      endDate: isoDate(dateRange.end),
    };
  }, [churchId, dateRange]);

  const comparisonArgs = useMemo(() => {
    if (!churchId || !dateRange) return "skip" as const;
    return {
      churchId,
      startDate: isoDate(dateRange.comparisonStart),
      endDate: isoDate(dateRange.comparisonEnd),
    };
  }, [churchId, dateRange]);

  const incomeExpenseReport = useQuery(
    api.reports.getIncomeExpenseReport,
    incomeExpenseArgs
  );
  const comparisonReport = useQuery(
    api.reports.getIncomeExpenseReport,
    comparisonArgs
  );

  useEffect(() => {
    if (churchId) {
      generateInsights({ churchId }).catch(console.error);
    }
  }, [churchId, generateInsights]);

  const categoryLookup = useMemo(() => {
    if (!categories) return new Map<string, Doc<"categories">>();
    return new Map(categories.map((category) => [category._id, category]));
  }, [categories]);

  const generalFundBalance = useMemo(() => {
    if (!funds) return 0;
    return funds
      .filter((fund) => fund.type === "general")
      .reduce((sum, fund) => sum + fund.balance, 0);
  }, [funds]);

  const restrictedFundBalance = useMemo(() => {
    if (!funds) return 0;
    return funds
      .filter((fund) => fund.type === "restricted")
      .reduce((sum, fund) => sum + fund.balance, 0);
  }, [funds]);

  const designatedFundBalance = useMemo(() => {
    if (!funds) return 0;
    return funds
      .filter((fund) => fund.type === "designated")
      .reduce((sum, fund) => sum + fund.balance, 0);
  }, [funds]);

  const income = incomeExpenseReport?.income ?? 0;
  const expenses = incomeExpenseReport?.expense ?? 0;
  const netResult = incomeExpenseReport?.net ?? 0;
  const previousNet = comparisonReport?.net ?? 0;

  const giftAidEligible = useMemo(() => {
    return (
      incomeExpenseReport?.transactions
        ?.filter((transaction) => transaction.giftAid)
        .reduce((sum, transaction) => sum + transaction.amount, 0) ?? 0
    );
  }, [incomeExpenseReport?.transactions]);

  const donorActivity = useMemo(() => {
    const transactions = incomeExpenseReport?.transactions ?? [];
    const groupedByDonor = new Map<string, { total: number; count: number }>();

    transactions
      .filter((txn) => txn.donorId)
      .forEach((txn) => {
        const donorId = txn.donorId as string;
        const existing = groupedByDonor.get(donorId) ?? { total: 0, count: 0 };
        existing.total += txn.amount;
        existing.count += 1;
        groupedByDonor.set(donorId, existing);
      });

    const recurringDonors = Array.from(groupedByDonor.values()).filter(
      (entry) => entry.count >= 2
    ).length;

    const incomeTransactions = transactions.filter((txn) => txn.type === "income");
    const incomeTransactionCount = incomeTransactions.length;
    const averageDonation = incomeTransactionCount
      ? incomeTransactions.reduce((sum, txn) => sum + txn.amount, 0) /
        incomeTransactionCount
      : 0;

    const newDonors = donors
      ? donors.filter((donor) => {
          const createdAt = new Date(donor._creationTime);
          return createdAt >= dateRange.start && createdAt <= dateRange.end;
        }).length
      : 0;

    const activeDonors = donors?.length ?? 0;

    const donorsWithGifts = new Set(
      transactions
        .filter((txn) => txn.donorId)
        .map((txn) => (txn.donorId as Id<"donors">).toString())
    );

    const lapsedDonors = donors
      ? donors.filter((donor) => !donorsWithGifts.has(donor._id)).length
      : 0;

    return {
      recurringDonors,
      averageDonation,
      newDonors,
      activeDonors,
      lapsedDonors,
    };
  }, [
    incomeExpenseReport?.transactions,
    donors,
    dateRange.start,
    dateRange.end,
  ]);

  const donorRetentionRate = useMemo(() => {
    const transactions = incomeExpenseReport?.transactions ?? [];
    const previousTransactions = comparisonReport?.transactions ?? [];
    const currentDonorIds = new Set(
      transactions
        .filter((txn) => txn.donorId)
        .map((txn) => txn.donorId as string)
    );
    const previousDonorIds = new Set(
      previousTransactions
        .filter((txn) => txn.donorId)
        .map((txn) => txn.donorId as string)
    );

    if (previousDonorIds.size === 0) return 0;
    let retained = 0;
    previousDonorIds.forEach((id) => {
      if (currentDonorIds.has(id)) retained += 1;
    });
    return (retained / previousDonorIds.size) * 100;
  }, [incomeExpenseReport?.transactions, comparisonReport?.transactions]);

  const transactionSparkline: TrendPoint[] = useMemo(() => {
    if (!recentTransactions) return [];
    const sorted = [...recentTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let running = 0;
    return sorted.map((transaction) => {
      running += transaction.type === "income" ? transaction.amount : -transaction.amount;
      return {
        label: formatUkDateNumeric(transaction.date) ?? transaction.date,
        value: running,
      };
    });
  }, [recentTransactions]);

  const growthSparkline: TrendPoint[] = useMemo(() => {
    if (!periodHistory) return [];
    const reversed = [...periodHistory].reverse().slice(0, 6);
    return reversed.map((period) => ({
      label: period.periodName,
      value: period.reviewedCount ?? 0,
    }));
  }, [periodHistory]);

  const financialKpis = useMemo<DashboardKpi[]>(() => {
    const delta: KpiDelta | undefined = comparisonReport
      ? {
          value: Math.round(netResult - previousNet),
          percentage: calculatePercentageChange(netResult, previousNet),
          isPositive: netResult >= previousNet,
          comparisonLabel: `vs ${dateRange.comparisonLabel}`,
        }
      : undefined;

    return [
      {
        key: "general-balance",
        title: "General Fund Balance",
        value: formatCurrency(generalFundBalance),
        subtitle: "Core operational reserves",
        status: generalFundBalance >= 0 ? "positive" : "negative",
        delta,
        sparkline: transactionSparkline,
      },
      {
        key: "income",
        title: "Total Income",
        value: formatCurrency(income),
        subtitle: `${PERIOD_OPTIONS.find((opt) => opt.id === selectedPeriod)?.label ?? "Period"}`,
        status: income >= previousNet ? "positive" : "neutral",
        delta: comparisonReport
          ? {
              value: Math.round(income - (comparisonReport?.income ?? 0)),
              percentage: calculatePercentageChange(
                income,
                comparisonReport?.income ?? 0
              ),
              isPositive: income >= (comparisonReport?.income ?? 0),
              comparisonLabel: `vs ${dateRange.comparisonLabel}`,
            }
          : undefined,
        sparkline: transactionSparkline,
      },
      {
        key: "expenses",
        title: "Total Expenses",
        value: formatCurrency(expenses),
        subtitle: `${PERIOD_OPTIONS.find((opt) => opt.id === selectedPeriod)?.label ?? "Period"}`,
        status: expenses <= income ? "positive" : "negative",
        delta: comparisonReport
          ? {
              value: Math.round(expenses - (comparisonReport?.expense ?? 0)),
              percentage: calculatePercentageChange(
                expenses,
                comparisonReport?.expense ?? 0
              ),
              isPositive: expenses <= (comparisonReport?.expense ?? 0),
              comparisonLabel: `vs ${dateRange.comparisonLabel}`,
            }
          : undefined,
        sparkline: transactionSparkline,
      },
      {
        key: "surplus",
        title: "Operational Surplus/Deficit",
        value: formatCurrency(netResult),
        subtitle: "Income minus expenses",
        status: netResult >= 0 ? "positive" : "negative",
        delta,
        sparkline: transactionSparkline,
      },
      {
        key: "budget",
        title: "Budget Variance",
        value: formatCurrency(netResult - previousNet),
        subtitle: "Actual vs previous period",
        status: netResult >= previousNet ? "positive" : "negative",
        delta,
        sparkline: growthSparkline,
      },
      {
        key: "restricted",
        title: "Restricted & Designated",
        value: formatCurrency(restrictedFundBalance + designatedFundBalance),
        subtitle: "Funds earmarked for ministries",
        status: "neutral" as const,
        delta: comparisonReport
          ? {
              value: Math.round(
                restrictedFundBalance + designatedFundBalance - generalFundBalance
              ),
              percentage: undefined,
              isPositive: restrictedFundBalance + designatedFundBalance >= generalFundBalance,
              comparisonLabel: "Fund mix",
            }
          : undefined,
        sparkline: growthSparkline,
      },
    ];
  }, [
    comparisonReport,
    dateRange.comparisonLabel,
    designatedFundBalance,
    generalFundBalance,
    growthSparkline,
    income,
    netResult,
    previousNet,
    restrictedFundBalance,
    selectedPeriod,
    transactionSparkline,
    expenses,
  ]);

  const donorKpis = useMemo<DashboardKpi[]>(() => {
    return [
      {
        key: "active-donors",
        title: "Total Active Donors",
        value: donorActivity.activeDonors.toString(),
        subtitle: "Supporters in the current year",
        status: donorActivity.activeDonors > 0 ? "positive" : "neutral",
        delta: donors
          ? {
              value: donorActivity.newDonors,
              percentage: donors.length
                ? (donorActivity.newDonors / donors.length) * 100
                : 0,
              isPositive: donorActivity.newDonors >= 0,
              comparisonLabel: "New this period",
            }
          : undefined,
        sparkline: growthSparkline,
      },
      {
        key: "recurring-donors",
        title: "Recurring Donors",
        value: donorActivity.recurringDonors.toString(),
        subtitle: "Multiple gifts in the period",
        status: donorActivity.recurringDonors > 0 ? "positive" : "neutral",
        delta: donors
          ? {
              value: donorActivity.recurringDonors,
              percentage: donors.length
                ? (donorActivity.recurringDonors / donors.length) * 100
                : 0,
              isPositive: true,
              comparisonLabel: "Share of total",
            }
          : undefined,
        sparkline: growthSparkline,
      },
      {
        key: "new-donors",
        title: "New Donors",
        value: donorActivity.newDonors.toString(),
        subtitle: "First-time supporters",
        status: donorActivity.newDonors > 0 ? "positive" : "neutral",
        delta: donors
          ? {
              value: donorActivity.newDonors,
              percentage: donors.length
                ? (donorActivity.newDonors / donors.length) * 100
                : 0,
              isPositive: true,
              comparisonLabel: "Growth",
            }
          : undefined,
        sparkline: growthSparkline,
      },
      {
        key: "lapsed-donors",
        title: "Lapsed Donors",
        value: donorActivity.lapsedDonors.toString(),
        subtitle: "No gift this period",
        status: donorActivity.lapsedDonors === 0 ? "positive" : "negative",
        delta: donors
          ? {
              value: donorActivity.lapsedDonors,
              percentage: donors.length
                ? (donorActivity.lapsedDonors / donors.length) * 100
                : 0,
              isPositive: donorActivity.lapsedDonors === 0,
              comparisonLabel: "Require follow up",
            }
          : undefined,
        sparkline: growthSparkline,
      },
      {
        key: "average-donation",
        title: "Average Donation Size",
        value: formatCurrency(donorActivity.averageDonation),
        subtitle: "Per gift this period",
        status: "neutral" as const,
        delta: comparisonReport
          ? {
              value: Math.round(
                donorActivity.averageDonation -
                  ((comparisonReport?.transactions ?? [])
                    .filter((txn) => txn.type === "income")
                    .reduce((sum, txn) => sum + txn.amount, 0) /
                    Math.max(
                      (comparisonReport?.transactions ?? []).filter(
                        (txn) => txn.type === "income"
                      ).length,
                      1
                    ))
              ),
              percentage: undefined,
              isPositive: true,
              comparisonLabel: "vs prior period",
            }
          : undefined,
        sparkline: transactionSparkline,
      },
      {
        key: "gift-aid",
        title: "Gift Aid Eligible & Claimed",
        value: `${formatCurrency(giftAidEligible)} eligible`,
        subtitle: "Claim progress",
        status: giftAidEligible > 0 ? "positive" : "neutral",
        delta: {
          value: giftAidEligible * 0.25,
          percentage: giftAidEligible ? 25 : 0,
          isPositive: true,
          comparisonLabel: "Estimated claim",
        },
        sparkline: transactionSparkline,
      },
    ];
  }, [
    comparisonReport,
    donorActivity.activeDonors,
    donorActivity.averageDonation,
    donorActivity.lapsedDonors,
    donorActivity.newDonors,
    donorActivity.recurringDonors,
    donors,
    giftAidEligible,
    growthSparkline,
    transactionSparkline,
  ]);

  const advancedKpis = useMemo<DashboardKpi[]>(() => {
    const topDonorContribution = (() => {
      const transactions = incomeExpenseReport?.transactions ?? [];
      const incomes = transactions.filter((txn) => txn.type === "income");
      if (incomes.length === 0) return 0;
      const totals = new Map<string, number>();
      incomes.forEach((txn) => {
        const donorId = txn.donorId as string | undefined;
        if (!donorId) return;
        totals.set(donorId, (totals.get(donorId) ?? 0) + txn.amount);
      });
      const sorted = Array.from(totals.values()).sort((a, b) => b - a);
      const topTen = sorted.slice(0, 10).reduce((sum, value) => sum + value, 0);
      const totalIncome = incomes.reduce((sum, txn) => sum + txn.amount, 0);
      return totalIncome ? (topTen / totalIncome) * 100 : 0;
    })();

    const incomeDiversity = (() => {
      const transactions = incomeExpenseReport?.transactions ?? [];
      if (!transactions.length) return { regular: 0, fundraising: 0, grants: 0 };
      const totals = { regular: 0, fundraising: 0, grants: 0 };
      transactions.forEach((txn) => {
        if (txn.type !== "income") return;
        const category = txn.categoryId
          ? categoryLookup.get(txn.categoryId as string)
          : undefined;
        if (category?.name?.toLowerCase().includes("grant")) {
          totals.grants += txn.amount;
        } else if (category?.name?.toLowerCase().includes("event")) {
          totals.fundraising += txn.amount;
        } else {
          totals.regular += txn.amount;
        }
      });
      const total = totals.regular + totals.fundraising + totals.grants;
      if (!total) return { regular: 0, fundraising: 0, grants: 0 };
      return {
        regular: (totals.regular / total) * 100,
        fundraising: (totals.fundraising / total) * 100,
        grants: (totals.grants / total) * 100,
      };
    })();

    const fundHealthIndex = (() => {
      const restrictedRatio = generalFundBalance
        ? (restrictedFundBalance + designatedFundBalance) / generalFundBalance
        : 0;
      return restrictedRatio;
    })();

    return [
      {
        key: "giving-growth",
        title: "Giving Growth Rate",
        value: `${calculatePercentageChange(
          income,
          comparisonReport?.income ?? 0
        ).toFixed(1)}%`,
        subtitle: "Period-over-period",
        status: income >= (comparisonReport?.income ?? 0) ? "positive" : "negative",
        sparkline: transactionSparkline,
      },
      {
        key: "income-concentration",
        title: "Income Concentration",
        value: `${topDonorContribution.toFixed(1)}% from top 10 donors`,
        subtitle: "Monitor dependency",
        status: topDonorContribution <= 60 ? "positive" : "negative",
        sparkline: transactionSparkline,
      },
      {
        key: "income-diversity",
        title: "Income Diversity",
        value: `${incomeDiversity.regular.toFixed(0)}% regular · ${incomeDiversity.fundraising.toFixed(0)}% events · ${incomeDiversity.grants.toFixed(0)}% grants`,
        subtitle: "Mix of giving sources",
        status: "neutral" as const,
        sparkline: growthSparkline,
      },
      {
        key: "fund-health",
        title: "Fund Health Index",
        value: `${(fundHealthIndex * 100).toFixed(0)}% of general balance restricted`,
        subtitle: "Ensure operational coverage",
        status: fundHealthIndex < 1 ? "positive" : "negative",
        sparkline: growthSparkline,
      },
      {
        key: "donor-retention",
        title: "Donor Retention",
        value: `${donorRetentionRate.toFixed(1)}% retained`,
        subtitle: "Returning donors vs prior period",
        status: donorRetentionRate >= 60 ? "positive" : "negative",
        sparkline: transactionSparkline,
      },
      {
        key: "giving-per-attender",
        title: "Giving Per Attender",
        value: formatCurrency(
          income / Math.max(donorActivity.activeDonors || 1, 1)
        ),
        subtitle: "Income divided by active donors",
        status: "neutral" as const,
        sparkline: growthSparkline,
      },
    ];
  }, [
    categoryLookup,
    comparisonReport?.income,
    donorRetentionRate,
    generalFundBalance,
    growthSparkline,
    income,
    incomeExpenseReport?.transactions,
    restrictedFundBalance,
    designatedFundBalance,
    donorActivity.activeDonors,
    transactionSparkline,
  ]);


  if (
    funds === undefined ||
    recentTransactions === undefined ||
    totalFunds === undefined
  ) {
    return (
      <div className="space-y-8 p-6">
        <div className="space-y-2">
          <div className="h-6 w-60 rounded bg-grey-light" />
          <div className="h-4 w-80 rounded bg-grey-light" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-ledger bg-paper">
              <CardHeader>
                <div className="h-4 w-32 rounded bg-grey-light" />
              </CardHeader>
              <CardContent>
                <div className="h-10 w-24 rounded bg-grey-light" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-primary text-xs uppercase">
                Live finance view
              </Badge>
              <span className="flex items-center gap-1 text-xs font-primary text-grey-mid">
                <Calendar className="h-3 w-3" />
                {dateRange.label}
              </span>
            </div>
            <h1 className="text-3xl font-semibold text-ink">
              Finance & Donor Health Dashboard
            </h1>
            <p className="max-w-3xl text-sm font-primary text-grey-mid">
              Instantly understand your fund balances, income trends, donor engagement, and growth metrics. AI highlights urgent issues while quick actions keep your ledger up to date.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="border-ledger font-primary" asChild>
              <Link href="/reports">
                <BarChart3 className="mr-2 h-4 w-4" />
                Run Report
              </Link>
            </Button>
            <Button variant="outline" className="border-ledger font-primary" asChild>
              <Link href="/funds">
                <Layers className="mr-2 h-4 w-4" />
                Manage Funds
              </Link>
            </Button>
            <Button className="font-primary" asChild>
              <Link href="/transactions">
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Link>
            </Button>
          </div>
        </div>
        <PeriodSelector
          options={PERIOD_OPTIONS}
          selected={selectedPeriod}
          onSelect={(value) => setSelectedPeriod(value as PeriodKey)}
          onNavigate={(direction) => {
            setPeriodOffset((prev) =>
              prev + (direction === "previous" ? -1 : 1)
            );
          }}
          comparisonLabel={`vs ${dateRange.comparisonLabel}`}
          onCustomRange={() => window.alert("Custom range coming soon")}
        />
      </div>

      <section aria-label="Key performance indicators" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Financial Health KPIs</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={showGrowthMetrics ? "outline" : "default"}
              className={cn(
                "border-ledger font-primary text-xs uppercase tracking-wide",
                showGrowthMetrics ? "bg-paper" : ""
              )}
              onClick={() => setShowGrowthMetrics(false)}
            >
              Finance & Donors
            </Button>
            <Button
              variant={showGrowthMetrics ? "default" : "outline"}
              className={cn(
                "border-ledger font-primary text-xs uppercase tracking-wide",
                showGrowthMetrics ? "" : "bg-paper"
              )}
              onClick={() => setShowGrowthMetrics(true)}
            >
              Growth Metrics
            </Button>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {(showGrowthMetrics ? advancedKpis : financialKpis).map((kpi) => (
            <KpiCard
              key={kpi.key}
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              delta={kpi.delta}
              status={kpi.status as "positive" | "negative" | "neutral"}
              sparkline={kpi.sparkline}
            />
          ))}
        </div>
        {!showGrowthMetrics && (
          <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {donorKpis.map((kpi) => (
              <KpiCard
                key={kpi.key}
                title={kpi.title}
                value={kpi.value}
                subtitle={kpi.subtitle}
                delta={kpi.delta}
                status={kpi.status as "positive" | "negative" | "neutral"}
                sparkline={kpi.sparkline}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3" aria-label="Insights and period status">
        <div className="lg:col-span-2 space-y-6">
          {currentPeriod && (
            <Card className="border-ledger bg-paper">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-ink">
                    <Calendar className="h-5 w-5" />
                    {currentPeriod.periodName}
                  </CardTitle>
                  <CardDescription className="font-primary text-grey-mid">
                    {periodMetrics
                      ? `${periodMetrics.categorized} of ${periodMetrics.total} transactions categorised`
                      : "Categorisation progress"}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-primary text-xs uppercase tracking-wide",
                    currentPeriod.status === "completed" && "border-success text-success",
                    currentPeriod.status === "overdue" && "border-error text-error"
                  )}
                >
                  {currentPeriod.status === "overdue"
                    ? `Overdue (${currentPeriod.overdueDays ?? 0} days)`
                    : currentPeriod.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {periodMetrics && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-primary text-grey-mid">
                      <span>Ledger progress</span>
                      <span className="text-ink font-semibold">
                        {periodMetrics.percentComplete}% complete
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-grey-light">
                      <div
                        className="h-full rounded-full bg-success"
                        style={{ width: `${periodMetrics.percentComplete}%` }}
                      />
                    </div>
                    {periodMetrics.needsReview > 0 && (
                      <div className="flex items-center gap-2 rounded border border-error/30 bg-error/10 p-2 text-xs font-primary text-error">
                        <ArrowDownRight className="h-3 w-3" />
                        {periodMetrics.needsReview} transactions flagged for review
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="border-ledger font-primary" asChild>
                    <Link href="/reports">
                      <Target className="mr-2 h-4 w-4" />
                      Review Month-End Checklist
                    </Link>
                  </Button>
                  <Button variant="ghost" className="font-primary text-xs uppercase tracking-wide text-grey-mid" asChild>
                    <Link href="/reconciliation">
                      <Receipt className="mr-2 h-3 w-3" />
                      Reconcile Accounts
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {churchId && <InsightsWidget churchId={churchId} />}
        </div>
        <Card className="border-ledger bg-paper">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ink">
              <Church className="h-5 w-5" /> Fund Health Overview
            </CardTitle>
            <CardDescription className="font-primary text-grey-mid">
              Balance distribution across general, restricted, and designated funds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {[
                {
                  label: "General funds",
                  amount: generalFundBalance,
                  tone: "text-success",
                },
                {
                  label: "Restricted funds",
                  amount: restrictedFundBalance,
                  tone: "text-grey-dark",
                },
                {
                  label: "Designated funds",
                  amount: designatedFundBalance,
                  tone: "text-grey-dark",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded border border-ledger bg-highlight/50 px-4 py-3"
                >
                  <span className="font-primary text-xs uppercase tracking-wide text-grey-mid">
                    {item.label}
                  </span>
                  <span className={cn("font-primary text-sm font-semibold", item.tone)}>
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded border border-ledger bg-highlight/40 p-3 text-xs font-primary text-grey-mid">
              <p>
                Maintain at least three months of operating costs in your general fund. Restricted balances show obligations to ministries and grant conditions.
              </p>
            </div>
            <Button variant="outline" className="w-full border-ledger font-primary" asChild>
              <Link href="/funds">
                View fund breakdown
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
