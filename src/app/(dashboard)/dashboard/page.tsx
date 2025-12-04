"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import {
  BarChart3,
  Layers,
  Plus,
  Receipt,
  Target,
  Church,
  ChevronRight,
  UserCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";
import {
  BulkTransactionDialog,
  type TransactionCreateValues,
} from "@/components/transactions/bulk-transaction-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InsightsWidget } from "@/components/ai/insights-widget";
import {
  HeroMetricCard,
  type HeroMetricCardProps,
} from "@/components/dashboard/hero-metric-card";
import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { PeriodSelector, type PeriodOption } from "@/components/dashboard/period-selector";
import { api, type Id, type Doc } from "@/lib/convexGenerated";
import { useChurch } from "@/contexts/church-context";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const IMPORTANT_FUND_THRESHOLD = 5000;

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

interface DateRangeResult {
  start: Date;
  end: Date;
  comparisonStart: Date;
  comparisonEnd: Date;
  label: string;
  comparisonLabel: string;
  shortComparisonLabel: string;
}

type PeriodKey =
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "this-year"
  | "ytd";

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
    comparisonEnd = new Date(
      start.getFullYear() - 1,
      end.getMonth(),
      end.getDate()
    );
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

  let shortComparisonLabel = "";
  if (option === "this-month") {
    shortComparisonLabel = "Last Month";
  } else if (option === "last-month") {
    shortComparisonLabel = comparisonStart.toLocaleDateString("en-GB", {
      month: "long",
    });
  } else if (option === "this-quarter") {
    const quarter = Math.floor(comparisonStart.getMonth() / 3) + 1;
    shortComparisonLabel = `Q${quarter}`;
  } else if (option === "this-year" || option === "ytd") {
    shortComparisonLabel = comparisonStart.getFullYear().toString();
  }

  return { start, end, comparisonStart, comparisonEnd, label, comparisonLabel, shortComparisonLabel };
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

function monthYearLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function quarterLabel(d: Date) {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}
export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("this-month");
  const [periodOffset] = useState(0);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);

  const { churchId } = useChurch();

  const funds = useQuery(
    api.funds.list,
    churchId ? { churchId } : "skip"
  );
  const categories = useQuery(
    api.categories.getCategories,
    churchId ? { churchId } : "skip"
  );
  const donors = useQuery(
    api.donors.getDonors,
    churchId ? { churchId } : "skip"
  );
  const generateInsights = useMutation(api.aiInsights.generateInsights);
  const createTransaction = useMutation(api.transactions.createTransaction);

  const currentPeriod = useQuery(
    api.financialPeriods.getCurrentPeriod,
    churchId ? { churchId } : "skip"
  );
  const periodMetrics = useQuery(
    api.financialPeriods.getPeriodMetrics,
    currentPeriod?._id ? { periodId: currentPeriod._id } : "skip"
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

  const rollingRange = useMemo(() => {
    if (!dateRange) return null;
    const end = new Date(dateRange.end);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    return { start, end };
  }, [dateRange]);

  const rollingArgs = useMemo(() => {
    if (!churchId || !rollingRange) return "skip" as const;
    return {
      churchId,
      startDate: isoDate(rollingRange.start),
      endDate: isoDate(rollingRange.end),
    };
  }, [churchId, rollingRange]);

  const incomeExpenseReport = useQuery(
    api.reports.getIncomeExpenseReport,
    incomeExpenseArgs
  );
  const comparisonReport = useQuery(
    api.reports.getIncomeExpenseReport,
    comparisonArgs
  );
  const rollingReport = useQuery(
    api.reports.getIncomeExpenseReport,
    rollingArgs
  );

  useEffect(() => {
    if (churchId) {
      generateInsights({ churchId }).catch(console.error);
    }
  }, [churchId, generateInsights]);

  const fundLookup = useMemo(() => {
    const list = funds ?? [];
    return new Map(list.map((fund) => [fund._id, fund]));
  }, [funds]);

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

  const generalFundMovement = useMemo(() => {
    const transactions = incomeExpenseReport?.transactions ?? [];
    return transactions.reduce((sum, txn) => {
      const fundId = txn.fundId as Id<"funds"> | null;
      const fund = fundId ? fundLookup.get(fundId) : undefined;
      if (!fund || fund.type !== "general") return sum;
      return sum + (txn.type === "income" ? txn.amount : -txn.amount);
    }, 0);
  }, [incomeExpenseReport?.transactions, fundLookup]);

  const previousGeneralBalance = generalFundBalance - generalFundMovement;
  const generalTrendPercent = calculatePercentageChange(
    generalFundBalance,
    previousGeneralBalance
  );

  const incomeChangePercent = calculatePercentageChange(
    income,
    comparisonReport?.income ?? 0
  );

  const handleCreateTransactions = async (transactions: TransactionCreateValues[]) => {
    for (const transaction of transactions) {
      await createTransaction(transaction);
    }
  };

  const donorActivity = useMemo(() => {
    const transactions = incomeExpenseReport?.transactions ?? [];
    const groupedByDonor = new Map<string, { total: number; count: number }>();

    transactions
      .filter((txn) => txn.donorId)
      .forEach((txn) => {
        const donorId = (txn.donorId as Id<"donors">).toString();
        const existing = groupedByDonor.get(donorId) ?? { total: 0, count: 0 };
        existing.total += txn.amount;
        existing.count += 1;
        groupedByDonor.set(donorId, existing);
      });

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

    const donorsWithGifts = new Set(
      transactions
        .filter((txn) => txn.donorId)
        .map((txn) => (txn.donorId as Id<"donors">).toString())
    );

    const lapsedDonors = donors
      ? donors.filter((donor) => !donorsWithGifts.has(donor._id)).length
      : 0;

    return {
      recurringDonors: Array.from(groupedByDonor.values()).filter(
        (entry) => entry.count >= 2
      ).length,
      averageDonation,
      newDonors,
      activeDonors: donors?.length ?? 0,
      lapsedDonors,
    };
  }, [incomeExpenseReport?.transactions, donors, dateRange.start, dateRange.end]);
  const previousActiveDonors = useMemo(() => {
    const transactions = comparisonReport?.transactions ?? [];
    const donorSet = new Set<string>();
    transactions
      .filter((txn) => txn.donorId)
      .forEach((txn) => donorSet.add((txn.donorId as Id<"donors">).toString()));
    return donorSet.size;
  }, [comparisonReport?.transactions]);

  const giftAidEligible = useMemo(() => {
    return (
      incomeExpenseReport?.transactions
        ?.filter((transaction) => transaction.giftAid)
        .reduce((sum, transaction) => sum + transaction.amount, 0) ?? 0
    );
  }, [incomeExpenseReport?.transactions]);

  const rollingMonths = useMemo(() => {
    if (!rollingRange) return [] as { key: string; label: string }[];
    const months: { key: string; label: string }[] = [];
    for (let i = 0; i < 12; i += 1) {
      const month = new Date(rollingRange.start);
      month.setMonth(month.getMonth() + i);
      const key = `${month.getFullYear()}-${month.getMonth()}`;
      months.push({
        key,
        label: month.toLocaleDateString("en-GB", { month: "short" }),
      });
    }
    return months;
  }, [rollingRange]);

  const monthlyIncomeExpense = useMemo(() => {
    const transactions = rollingReport?.transactions ?? [];
    const buckets = new Map<string, { income: number; expense: number }>();

    transactions.forEach((txn) => {
      const date = new Date(txn.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = buckets.get(key) ?? { income: 0, expense: 0 };
      if (txn.type === "income") {
        bucket.income += txn.amount;
      } else {
        bucket.expense += txn.amount;
      }
      buckets.set(key, bucket);
    });

    return rollingMonths.map(({ key, label }) => {
      const bucket = buckets.get(key) ?? { income: 0, expense: 0 };
      return { month: label, income: bucket.income, expense: bucket.expense };
    });
  }, [rollingReport?.transactions, rollingMonths]);

  const donorSetsByMonth = useMemo(() => {
    const transactions = rollingReport?.transactions ?? [];
    const map = new Map<string, Set<string>>();
    transactions.forEach((txn) => {
      if (!txn.donorId) return;
      const date = new Date(txn.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const set = map.get(key) ?? new Set<string>();
      set.add((txn.donorId as Id<"donors">).toString());
      map.set(key, set);
    });
    return map;
  }, [rollingReport?.transactions]);

  const donorRetentionSeries = useMemo(() => {
    return rollingMonths.map(({ key, label }, index) => {
      if (index === 0) {
        return { month: label, retention: 100 };
      }
      const current = donorSetsByMonth.get(key) ?? new Set<string>();
      const previousKey = rollingMonths[index - 1]?.key;
      const previous = previousKey
        ? donorSetsByMonth.get(previousKey) ?? new Set<string>()
        : new Set<string>();
      if (previous.size === 0) {
        return { month: label, retention: current.size > 0 ? 100 : 0 };
      }
      let retained = 0;
      previous.forEach((id) => {
        if (current.has(id)) retained += 1;
      });
      return {
        month: label,
        retention: previous.size ? (retained / previous.size) * 100 : 0,
      };
    });
  }, [donorSetsByMonth, rollingMonths]);

  const donorRetentionRate = useMemo(() => {
    if (!donorRetentionSeries.length) return 0;
    return donorRetentionSeries[donorRetentionSeries.length - 1].retention;
  }, [donorRetentionSeries]);

  const sortedFunds = useMemo(() => {
    const list = funds ?? [];
    return [...list]
      .map((fund) => ({
        ...fund,
        isImportant: fund.balance >= IMPORTANT_FUND_THRESHOLD,
      }))
      .sort((a, b) => {
        if (a.isImportant !== b.isImportant) {
          return a.isImportant ? -1 : 1;
        }
        return b.balance - a.balance;
      });
  }, [funds]);

  const totalFundBalance = useMemo(
    () => sortedFunds.reduce((sum, fund) => sum + fund.balance, 0),
    [sortedFunds]
  );

  const budgetRows = useMemo(() => {
    return sortedFunds.map((fund) => {
      const budget = fund.fundraisingTarget ?? fund.balance;
      const variance = fund.balance - (budget ?? 0);
      const progress = budget ? (fund.balance / budget) * 100 : 0;
      const variancePercent = budget ? (variance / budget) * 100 : 0;
      const varianceAlert =
        fund.isImportant && Math.abs(variancePercent) >= 20 ? "warning" : null;
      return {
        id: fund._id,
        name: fund.name,
        budget,
        actual: fund.balance,
        variance,
        progress,
        variancePercent,
        isImportant: fund.isImportant,
        varianceAlert,
      };
    });
  }, [sortedFunds]);

  const givingChangePercent = incomeChangePercent;
  const lapsedRate = donorActivity.activeDonors
    ? (donorActivity.lapsedDonors / donorActivity.activeDonors) * 100
    : 0;
  const importantFundsAtRisk = sortedFunds.filter(
    (fund) => fund.isImportant && fund.balance < IMPORTANT_FUND_THRESHOLD * 1.1
  );
  const criticalMetric: HeroMetricCardProps = useMemo(() => {
    if (donorActivity.lapsedDonors > 30 || lapsedRate >= 20) {
      return {
        title: "Lapsed Donors",
        value: donorActivity.lapsedDonors.toString(),
        description: "Follow-up required",
        status: lapsedRate >= 30 ? "critical" : "warning",
        trend: {
          direction: "down",
          valueLabel: `${lapsedRate.toFixed(1)}% of base`,
          comparisonLabel: `Threshold ${Math.round(donorActivity.activeDonors * 0.2)} donors`,
        },
      };
    }

    if (givingChangePercent < -15) {
      return {
        title: "Giving Momentum",
        value: `${givingChangePercent.toFixed(1)}%`,
        description: "Giving declined vs prior period",
        status: givingChangePercent < -30 ? "critical" : "warning",
        trend: {
          direction: "down",
          valueLabel: `${Math.abs(givingChangePercent).toFixed(1)}% drop`,
          comparisonLabel: `vs ${dateRange.shortComparisonLabel}`,
        },
      };
    }

    if (netResult < 0) {
      return {
        title: "Operational Surplus",
        value: formatCurrency(netResult),
        description: "Expenses outpaced income this period",
        status: Math.abs(netResult) > income * 0.1 ? "critical" : "warning",
        trend: {
          direction: "down",
          valueLabel: `${formatCurrency(netResult - previousNet)}`,
          comparisonLabel: `vs ${dateRange.shortComparisonLabel}`,
        },
      };
    }

    if (importantFundsAtRisk.length > 0) {
      const lowest = importantFundsAtRisk[importantFundsAtRisk.length - 1];
      return {
        title: "Important Fund Cushion",
        value: formatCurrency(lowest.balance),
        description: `${lowest.name} nearing reserve limit`,
        status: "warning",
        trend: {
          direction: "down",
          valueLabel: "Monitor reserves",
          comparisonLabel: "Target ≥ £5K",
        },
      };
    }

    const netDirection = netResult >= previousNet ? "up" : "down";
    return {
      title: "Critical Issue",
      value: formatCurrency(netResult),
      description: "No critical alerts — maintain momentum",
      status: "healthy",
      trend: {
        direction: netDirection,
        valueLabel: `${netDirection === "up" ? "+" : ""}${(
          calculatePercentageChange(netResult, previousNet)
        ).toFixed(1)}%`,
        comparisonLabel: `vs ${dateRange.shortComparisonLabel}`,
      },
    };
  }, [
    dateRange.shortComparisonLabel,
    donorActivity.activeDonors,
    donorActivity.lapsedDonors,
    givingChangePercent,
    importantFundsAtRisk,
    income,
    lapsedRate,
    netResult,
    previousNet,
  ]);

  const heroMetrics: HeroMetricCardProps[] = [
    {
      title: "General Fund Balance",
      value: formatCurrency(generalFundBalance),
      description: "Core operational reserves",
      status: generalFundBalance >= IMPORTANT_FUND_THRESHOLD ? "healthy" : "warning",
      trend: {
        direction:
          generalTrendPercent === 0
            ? "flat"
            : generalTrendPercent > 0
            ? "up"
            : "down",
        valueLabel: `${generalTrendPercent >= 0 ? "+" : ""}${generalTrendPercent.toFixed(
          1
        )}%`,
        comparisonLabel: "vs period start",
      },
    },
    {
      title: "Total Income",
      value: formatCurrency(income),
      status: income >= expenses ? "healthy" : "warning",
      trend: {
        direction:
          incomeChangePercent === 0
            ? "flat"
            : incomeChangePercent > 0
            ? "up"
            : "down",
        valueLabel: `${incomeChangePercent >= 0 ? "+" : ""}${incomeChangePercent.toFixed(
          1
        )}%`,
        comparisonLabel: `vs ${dateRange.shortComparisonLabel}`,
      },
    },
    {
      title: "Active Donors",
      value: donorActivity.activeDonors.toString(),
      description: "Supporters giving this year",
      status: donorActivity.activeDonors > 0 ? "healthy" : "warning",
      trend: {
        direction:
          donorActivity.activeDonors === previousActiveDonors
            ? "flat"
            : donorActivity.activeDonors > previousActiveDonors
            ? "up"
            : "down",
        valueLabel: (() => {
          if (previousActiveDonors === 0) {
            const change = donorActivity.activeDonors - previousActiveDonors;
            return `${change >= 0 ? "+" : ""}${change} donors`;
          }
          const percentChange = calculatePercentageChange(
            donorActivity.activeDonors,
            previousActiveDonors
          );
          // Show absolute count if percentage change is extreme (> 500%)
          if (Math.abs(percentChange) > 500) {
            const change = donorActivity.activeDonors - previousActiveDonors;
            return `${change >= 0 ? "+" : ""}${change} donors`;
          }
          return `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(1)}%`;
        })(),
        comparisonLabel:
          previousActiveDonors > 0
            ? `vs ${dateRange.shortComparisonLabel}`
            : "First period benchmark",
      },
    },
    criticalMetric,
  ];
  const advancedMetrics = useMemo(() => {
    const transactions = incomeExpenseReport?.transactions ?? [];
    const incomes = transactions.filter((txn) => txn.type === "income");

    const topDonorContribution = (() => {
      if (incomes.length === 0) return 0;
      const totals = new Map<string, number>();
      incomes.forEach((txn) => {
        const donorId = txn.donorId ? (txn.donorId as Id<"donors">).toString() : null;
        if (!donorId) return;
        totals.set(donorId, (totals.get(donorId) ?? 0) + txn.amount);
      });
      const sorted = Array.from(totals.values()).sort((a, b) => b - a);
      const topTen = sorted.slice(0, 10).reduce((sum, value) => sum + value, 0);
      const totalIncome = incomes.reduce((sum, txn) => sum + txn.amount, 0);
      return totalIncome ? (topTen / totalIncome) * 100 : 0;
    })();

    const incomeDiversity = (() => {
      if (!transactions.length) return { regular: 0, fundraising: 0, grants: 0 };
      const totals = { regular: 0, fundraising: 0, grants: 0 };
      transactions.forEach((txn) => {
        if (txn.type !== "income") return;
        const category = txn.categoryId
          ? categories?.find((cat) => cat._id === txn.categoryId)
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

    const fundHealthIndex = generalFundBalance
      ? (restrictedFundBalance + designatedFundBalance) / generalFundBalance
      : 0;

    const givingPerAttender = donorActivity.activeDonors
      ? income / donorActivity.activeDonors
      : 0;

    return [
      {
        title: "Giving Growth Rate",
        value: `${incomeChangePercent.toFixed(1)}%`,
        hint: `vs ${dateRange.shortComparisonLabel}`,
      },
      {
        title: "Income Concentration",
        value: `${topDonorContribution.toFixed(1)}% from top 10 donors`,
        hint: "Monitor donor dependency",
      },
      {
        title: "Income Diversity",
        value: `${incomeDiversity.regular.toFixed(0)}% regular · ${incomeDiversity.fundraising.toFixed(
          0
        )}% events · ${incomeDiversity.grants.toFixed(0)}% grants`,
        hint: "Spread of giving sources",
      },
      {
        title: "Fund Health Index",
        value: `${(fundHealthIndex * 100).toFixed(0)}% restricted vs general`,
        hint: "Aim for < 100% restricted",
      },
      {
        title: "Donor Retention",
        value: `${donorRetentionRate.toFixed(1)}% retained`,
        hint: "Return donors vs prior month",
      },
      {
        title: "Giving per Attender",
        value: formatCurrency(givingPerAttender),
        hint: "Income divided by active donors",
      },
      {
        title: "Gift Aid Eligible",
        value: formatCurrency(giftAidEligible),
        hint: "Potential reclaim (est. 25%)",
      },
      {
        title: "Recurring Donors",
        value: donorActivity.recurringDonors.toString(),
        hint: "Multiple gifts this period",
      },
    ];
  }, [
    categories,
    dateRange.shortComparisonLabel,
    designatedFundBalance,
    donorActivity.activeDonors,
    donorActivity.recurringDonors,
    donorRetentionRate,
    giftAidEligible,
    generalFundBalance,
    income,
    incomeChangePercent,
    incomeExpenseReport?.transactions,
    restrictedFundBalance,
  ]);

  if (funds === undefined || incomeExpenseReport === undefined) {
    return (
      <div className="space-y-8 p-6">
        <div className="space-y-3">
          <div className="h-6 w-56 rounded bg-grey-light" />
          <div className="h-4 w-72 rounded bg-grey-light" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-ledger bg-paper">
              <CardHeader>
                <div className="h-3 w-24 rounded bg-grey-light" />
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
    <div className="flex min-h-screen flex-col bg-paper">
      <div className="flex-1 space-y-8 p-6 pb-32">
        <header className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="mt-2 space-y-2">
              <h1 className="text-3xl font-semibold text-ink">
                Finance &amp; Donor Health Dashboard
              </h1>
              <p className="max-w-3xl text-sm font-primary leading-relaxed text-grey-mid">
                Decision-ready insights prioritise important funds, donor momentum, and urgent follow-up so your team can act with confidence.
              </p>
            </div>
            <div />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PeriodSelector
              options={PERIOD_OPTIONS}
              selected={selectedPeriod}
              onSelect={(value) => setSelectedPeriod(value as PeriodKey)}
              label={(() => {
                switch (selectedPeriod) {
                  case "this-quarter":
                    return `${quarterLabel(dateRange.start)} vs ${quarterLabel(dateRange.comparisonStart)}`;
                  case "this-year":
                    return `${dateRange.end.getFullYear()} vs ${dateRange.comparisonEnd.getFullYear()}`;
                  case "ytd":
                    return `YTD ${dateRange.end.getFullYear()} vs YTD ${dateRange.comparisonEnd.getFullYear()}`;
                  default:
                    return `${monthYearLabel(dateRange.start)} vs ${monthYearLabel(dateRange.comparisonStart)}`;
                }
              })()}
              onCustomRange={() => window.alert("Custom range coming soon")}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="border-ink text-ink hover:bg-ink hover:text-white transition-colors font-medium" asChild>
                <Link href="/reports">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Run Report
                </Link>
              </Button>
              <Button variant="outline" className="border-ink text-ink hover:bg-ink hover:text-white transition-colors font-medium" asChild>
                <Link href="/funds">
                  <Layers className="mr-2 h-4 w-4" />
                  Manage Funds
                </Link>
              </Button>
              <Button
                className="bg-ink text-white hover:bg-ink/90 font-medium shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_#d4a574] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                onClick={() => setIsTransactionDialogOpen(true)}
                disabled={!churchId}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </div>
          </div>
          
        </header>

        {churchId && <InsightsWidget churchId={churchId} />}

        <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {heroMetrics.map((metric) => (
            <HeroMetricCard key={metric.title} {...metric} />
          ))}
        </section>

        <CollapsibleSection
          id="financial-details"
          title="Financial Details"
          description="Track income, spending, and fund balances at a glance"
          defaultOpen
        >
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card className="swiss-card border border-ink bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-ink">Income vs Expense (12 months)</CardTitle>
                <CardDescription className="text-grey-mid">
                  Bars highlight the balance between income and expenditure each month.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {monthlyIncomeExpense.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyIncomeExpense}>
                      <CartesianGrid stroke="#E8E8E6" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        stroke="#6B6B6B"
                        fontSize={12}
                        tickLine={false}
                        fontFamily="var(--font-mono)"
                      />
                      <YAxis
                        stroke="#6B6B6B"
                        fontSize={12}
                        tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                        width={60}
                        fontFamily="var(--font-mono)"
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(107, 142, 107, 0.1)" }}
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "#fafaf9",
                          border: "1px solid #000",
                          borderRadius: "8px",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                      <Bar dataKey="income" fill="#6b8e6b" radius={4} name="Income" />
                      <Bar dataKey="expense" fill="#d4a574" radius={4} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-grey-mid">
                    Not enough transaction history yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="swiss-card border border-ink bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-ink">
                  <Church className="h-5 w-5" /> Fund Balances
                </CardTitle>
                <CardDescription className="text-grey-mid">
                  Important funds (≥£5,000) appear first and display a ⭐ marker.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {sortedFunds.map((fund) => {
                    const percent = totalFundBalance
                      ? (fund.balance / totalFundBalance) * 100
                      : 0;
                    return (
                      <div key={fund._id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span
                            className={
                              fund.isImportant
                                ? "font-semibold text-ink"
                                : "text-grey-dark"
                            }
                          >
                            {fund.name} {fund.isImportant && <span aria-label="Important fund">⭐</span>}
                          </span>
                          <span className="text-ink font-[family-name:var(--font-mono)] font-medium">{formatCurrency(fund.balance)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-ink/10">
                          <div
                            className={
                              fund.isImportant
                                ? "h-full rounded-full bg-sage"
                                : "h-full rounded-full bg-grey-mid"
                            }
                            style={{ width: `${Math.max(percent, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-grey-mid pt-2 border-t border-ink/5">
                  ⭐ Important funds monitored for alerts. Total balance <span className="font-[family-name:var(--font-mono)] font-medium text-ink">{formatCurrency(totalFundBalance)}</span>.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="swiss-card border border-ink bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-ink">Budget Variance</CardTitle>
              <CardDescription className="text-grey-mid">
                Important funds appear first and highlight variances greater than 20%.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-grey-mid border-b border-ink/10">
                  <tr>
                    <th className="py-3 font-semibold">Fund</th>
                    <th className="py-3 font-semibold">Budget</th>
                    <th className="py-3 font-semibold">Actual</th>
                    <th className="py-3 font-semibold">Variance</th>
                    <th className="py-3 font-semibold">% of Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {budgetRows.map((row) => {
                    const varianceTone =
                      row.variance > 0 ? "text-sage" : row.variance < 0 ? "text-error" : "text-grey-mid";
                    return (
                      <tr
                        key={row.id}
                        className={row.varianceAlert ? "bg-amber-light/50" : undefined}
                      >
                        <td className="py-3 font-medium text-ink">
                          {row.name} {row.isImportant && <span aria-label="Important fund">⭐</span>}
                        </td>
                        <td className="py-3 text-grey-mid font-[family-name:var(--font-mono)]">{formatCurrency(row.budget ?? 0)}</td>
                        <td className="py-3 text-ink font-[family-name:var(--font-mono)] font-medium">{formatCurrency(row.actual)}</td>
                        <td className={`py-3 font-[family-name:var(--font-mono)] font-medium ${varianceTone}`}>{formatCurrency(row.variance)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-2 flex-1 rounded-full bg-ink/10">
                              <div
                                className={`h-full rounded-full ${row.progress >= 100 ? "bg-amber" : "bg-sage"}`}
                                style={{ width: `${Math.min(Math.max(row.progress, 4), 100)}%` }}
                              />
                            </div>
                            <span className="w-12 text-right text-sm font-[family-name:var(--font-mono)] text-grey-mid">
                              {row.progress.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </CollapsibleSection>

        <CollapsibleSection
          id="donor-health"
          title="Donor Health"
          description="Understand donor engagement, retention, and growth"
          defaultOpen
        >
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {[{
                  title: "Active Donors",
                  value: donorActivity.activeDonors,
                  change: donorActivity.newDonors,
                  icon: UserCheck,
                  tone: "text-sage",
                }, {
                  title: "Lapsed Donors",
                  value: donorActivity.lapsedDonors,
                  change: Math.max(donorActivity.lapsedDonors - donorActivity.newDonors, 0),
                  icon: UserMinus,
                  tone: donorActivity.lapsedDonors > 0 ? "text-error" : "text-grey-mid",
                }, {
                  title: "New Donors",
                  value: donorActivity.newDonors,
                  change: donorActivity.newDonors,
                  icon: UserPlus,
                  tone: donorActivity.newDonors > 0 ? "text-sage" : "text-grey-mid",
                }].map((card) => {
                  const Icon = card.icon;
                  return (
                    <Card key={card.title} className="swiss-card border border-ink bg-white">
                      <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <CardTitle className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid">
                          {card.title}
                        </CardTitle>
                        <Icon className={`h-4 w-4 ${card.tone}`} />
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-2xl font-bold text-ink font-[family-name:var(--font-mono)]">{card.value}</div>
                        <p className="text-xs text-grey-mid">
                          {card.title === "Lapsed Donors"
                            ? lapsedRate.toFixed(1) + "% of base"
                            : card.change >= 0
                            ? `+${card.change} this period`
                            : `${card.change}`}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Card className="swiss-card border border-ink bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-ink">Donor Retention Trend</CardTitle>
                  <CardDescription className="text-grey-mid">
                    Measures returning donors month over month.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-60">
                  {donorRetentionSeries.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={donorRetentionSeries}>
                        <CartesianGrid stroke="#E8E8E6" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          stroke="#6B6B6B"
                          fontSize={12}
                          tickLine={false}
                          fontFamily="var(--font-mono)"
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="#6B6B6B"
                          fontSize={12}
                          tickFormatter={(value) => `${value}%`}
                          fontFamily="var(--font-mono)"
                        />
                        <Tooltip
                          formatter={(value: number) => `${value.toFixed(1)}%`}
                          contentStyle={{
                            backgroundColor: "#fafaf9",
                            border: "1px solid #000",
                            borderRadius: "8px",
                            fontFamily: "var(--font-mono)",
                          }}
                        />
                        <Line type="monotone" dataKey="retention" stroke="#6b8e6b" strokeWidth={2} dot={{ r: 3, fill: "#6b8e6b" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-grey-mid">
                      Not enough donor history yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card className="swiss-card border border-ink bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-ink">Average Gift This Period</CardTitle>
                <CardDescription className="text-grey-mid">
                  Compare to the previous period to spot momentum shifts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-ink font-[family-name:var(--font-mono)]">
                  {formatCurrency(donorActivity.averageDonation)}
                </div>
                <p className="text-sm text-grey-mid">
                  New donors added: <span className="font-medium text-ink">{donorActivity.newDonors}</span>. Recurring donors: <span className="font-medium text-ink">{donorActivity.recurringDonors}</span>.
                </p>
                <Button variant="outline" className="w-full border-ink text-ink hover:bg-ink hover:text-white transition-colors font-medium" asChild>
                  <Link href="/donors">
                    Review donor list
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="advanced-metrics"
          title="Advanced Metrics"
          description="Deeper analysis on giving concentration and diversification"
          defaultOpen={false}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {advancedMetrics.map((metric) => (
              <Card key={metric.title} className="swiss-card border border-ink bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid">
                    {metric.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xl font-bold text-ink">{metric.value}</div>
                  <p className="text-xs text-grey-mid">{metric.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CollapsibleSection>
      </div>

      <div className="sticky bottom-0 border-t border-ink/10 bg-white/95 backdrop-blur hidden md:block">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-grey-mid">
              {currentPeriod ? currentPeriod.periodName : "Current period"}
            </div>
            {periodMetrics && (
              <div className="flex items-center gap-2 text-sm text-grey-mid">
                <span>Ledger progress</span>
                <div className="h-2 w-36 rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-sage"
                    style={{ width: `${periodMetrics.percentComplete}%` }}
                  />
                </div>
                <span className="text-ink font-[family-name:var(--font-mono)] font-semibold">
                  {periodMetrics.percentComplete}% ({periodMetrics.categorized} of {periodMetrics.total})
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="border-ink text-ink hover:bg-ink hover:text-white transition-colors font-medium" asChild>
              <Link href="/reports">
                <Target className="mr-2 h-4 w-4" />
                Review Month-End Checklist
              </Link>
            </Button>
            <Button variant="ghost" className="text-xs uppercase tracking-widest text-grey-mid hover:text-ink" asChild>
              <Link href="/reconciliation">
                <Receipt className="mr-2 h-4 w-4" />
                Reconcile Accounts
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction Dialog */}
      {churchId && funds && categories && donors && (
        <BulkTransactionDialog
          open={isTransactionDialogOpen}
          onOpenChange={setIsTransactionDialogOpen}
          churchId={churchId}
          funds={funds as Doc<"funds">[]}
          categories={categories as Doc<"categories">[]}
          donors={donors as Doc<"donors">[]}
          onSubmit={handleCreateTransactions}
        />
      )}
    </div>
  );
}
