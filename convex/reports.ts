import { query } from "./_generated/server";
import { v } from "convex/values";

export const getFundBalanceSummary = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const total = funds.reduce((sum, fund) => sum + fund.balance, 0);

    return {
      generatedAt: Date.now(),
      total,
      funds: funds.map((fund) => ({
        id: fund._id,
        name: fund.name,
        type: fund.type,
        balance: fund.balance,
      })),
    };
  },
});

export const getIncomeExpenseReport = query({
  args: {
    churchId: v.id("churches"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .collect();

    const filtered = transactions.filter(
      (txn) => txn.date >= args.startDate && txn.date <= args.endDate
    );

    const totals = filtered.reduce(
      (acc, txn) => {
        if (txn.type === "income") {
          acc.income += txn.amount;
        } else {
          acc.expense += txn.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );

    return {
      generatedAt: Date.now(),
      ...totals,
      net: totals.income - totals.expense,
      transactions: filtered,
    };
  },
});

export const getDonorStatementBatch = query({
  args: {
    churchId: v.id("churches"),
    fromDate: v.string(),
    toDate: v.string(),
    fundType: v.optional(v.union(
      v.literal("general"),
      v.literal("restricted"),
      v.literal("designated"),
      v.literal("all")
    )),
  },
  handler: async (ctx, args) => {
    const donors = await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const fundLookup = new Map(
      funds.map((fund) => [fund._id, { name: fund.name, type: fund.type }] as const)
    );

    const restrictedFundIds = funds
      .filter((fund) => fund.type === "restricted")
      .map((fund) => fund._id);
    const restrictedFundIdSet = new Set(restrictedFundIds.map((id) => id));
    
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .collect();

    let filtered = transactions.filter(
      (txn) => txn.date >= args.fromDate && txn.date <= args.toDate
    );

    if (args.fundType && args.fundType !== "all") {
      filtered = filtered.filter((txn) => {
        const fund = fundLookup.get(txn.fundId);
        return fund?.type === args.fundType;
      });
    }

    const pledgesByDonor = new Map<string, { pledgedTotal: number; pledgeCount: number }>();

    if (args.fundType === "restricted" && restrictedFundIds.length > 0) {
      const pledges = await ctx.db
        .query("fundPledges")
        .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
        .collect();

      for (const pledge of pledges) {
        if (!restrictedFundIdSet.has(pledge.fundId)) {
          continue;
        }
        const entry = pledgesByDonor.get(pledge.donorId) ?? {
          pledgedTotal: 0,
          pledgeCount: 0,
        };
        entry.pledgedTotal += pledge.amount;
        entry.pledgeCount += 1;
        pledgesByDonor.set(pledge.donorId, entry);
      }
    }

    const byDonor = new Map<string, typeof filtered>();
    for (const txn of filtered) {
      if (!txn.donorId) continue;
      const list = byDonor.get(txn.donorId) ?? [];
      list.push(txn);
      byDonor.set(txn.donorId, list);
    }

    return donors.map((donor) => {
      const donorTxns = byDonor.get(donor._id) ?? [];
      const total = donorTxns.reduce((sum, txn) => sum + txn.amount, 0);
      const pledgeInfo = pledgesByDonor.get(donor._id);
      const pledgeSummary = pledgeInfo
        ? {
            pledgedTotal: pledgeInfo.pledgedTotal,
            totalPaid: total,
            balanceDue: Math.max(pledgeInfo.pledgedTotal - total, 0),
            pledgeCount: pledgeInfo.pledgeCount,
          }
        : undefined;
      return {
        donor,
        transactions: donorTxns.map((txn) => ({
          ...txn,
          fundName: txn.fundId ? fundLookup.get(txn.fundId)?.name ?? null : null,
          fundType: txn.fundId ? fundLookup.get(txn.fundId)?.type ?? null : null,
        })),
        total,
        pledgeSummary,
      };
    }).filter((statement) => statement.total > 0);
  },
});

export const getGiftAidClaimReport = query({
  args: {
    churchId: v.id("churches"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .collect();

    const filtered = transactions.filter(
      (txn) =>
        txn.date >= args.startDate &&
        txn.date <= args.endDate &&
        txn.type === "income" &&
        txn.giftAid === true &&
        txn.donorId !== undefined
    );

    const donors = await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const donorLookup = new Map(donors.map((d) => [d._id, d]));

    type DonorId = typeof donors[number]["_id"];
    const byDonor = new Map<DonorId, typeof filtered>();
    for (const txn of filtered) {
      if (!txn.donorId) continue;
      const list = byDonor.get(txn.donorId) ?? [];
      list.push(txn);
      byDonor.set(txn.donorId, list);
    }

    const claimableAmount = filtered.reduce((sum, txn) => sum + txn.amount, 0);
    const giftAidValue = claimableAmount * 0.25;

    return {
      generatedAt: Date.now(),
      periodStart: args.startDate,
      periodEnd: args.endDate,
      claimableAmount,
      giftAidValue,
      transactionCount: filtered.length,
      donorBreakdown: Array.from(byDonor.entries()).map(([donorId, txns]) => {
        const donor = donorLookup.get(donorId);
        const total = txns.reduce((sum, txn) => sum + txn.amount, 0);
        return {
          donorId,
          donorName: donor?.name ?? "Unknown",
          hasDeclaration: donor?.giftAidDeclaration?.signed ?? false,
          donationCount: txns.length,
          donationTotal: total,
          giftAidAmount: total * 0.25,
          transactions: txns,
        };
      }),
    };
  },
});

export const getAnnualSummaryReport = query({
  args: {
    churchId: v.id("churches"),
    year: v.string(),
  },
  handler: async (ctx, args) => {
    const startDate = `${args.year}-01-01`;
    const endDate = `${args.year}-12-31`;

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .collect();

    const filtered = transactions.filter(
      (txn) => txn.date >= startDate && txn.date <= endDate
    );

    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const categoryLookup = new Map(categories.map((c) => [c._id, c]));
    const fundLookup = new Map(funds.map((f) => [f._id, f]));

    const totals = filtered.reduce(
      (acc, txn) => {
        if (txn.type === "income") {
          acc.totalIncome += txn.amount;
        } else {
          acc.totalExpense += txn.amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0 }
    );

    type CategoryId = typeof categories[number]["_id"] | "uncategorized";
    const byCategory = new Map<CategoryId, { income: number; expense: number }>();
    for (const txn of filtered) {
      const categoryId: CategoryId = txn.categoryId ?? "uncategorized";
      const current = byCategory.get(categoryId) ?? { income: 0, expense: 0 };
      if (txn.type === "income") {
        current.income += txn.amount;
      } else {
        current.expense += txn.amount;
      }
      byCategory.set(categoryId, current);
    }

    type FundId = typeof funds[number]["_id"];
    const byFund = new Map<FundId, { income: number; expense: number; balance: number }>();
    for (const txn of filtered) {
      const fundId = txn.fundId;
      const fund = fundLookup.get(fundId);
      const current = byFund.get(fundId) ?? { income: 0, expense: 0, balance: fund?.balance ?? 0 };
      if (txn.type === "income") {
        current.income += txn.amount;
      } else {
        current.expense += txn.amount;
      }
      byFund.set(fundId, current);
    }

    return {
      generatedAt: Date.now(),
      year: args.year,
      totalIncome: totals.totalIncome,
      totalExpense: totals.totalExpense,
      netSurplus: totals.totalIncome - totals.totalExpense,
      transactionCount: filtered.length,
      byCategory: Array.from(byCategory.entries()).map(([categoryId, totals]) => ({
        categoryId: categoryId === "uncategorized" ? categoryId : categoryId,
        categoryName: categoryId === "uncategorized" ? "Uncategorized" : (categoryLookup.get(categoryId)?.name ?? "Uncategorized"),
        ...totals,
      })),
      byFund: Array.from(byFund.entries()).map(([fundId, data]) => ({
        fundId,
        fundName: fundLookup.get(fundId)?.name ?? "Unknown",
        fundType: fundLookup.get(fundId)?.type ?? "general",
        currentBalance: data.balance,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      })),
    };
  },
});

export const getMonthlyIncomeExpenseReport = query({
  args: {
    churchId: v.id("churches"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const [transactions, categories] = await Promise.all([
      ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .collect(),
      ctx.db
        .query("categories")
        .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
        .collect(),
    ]);

    const filtered = transactions.filter(
      (txn) => txn.date >= args.startDate && txn.date <= args.endDate
    );

    const categoryLookup = new Map(categories.map((category) => [category._id, category]));

    type SubcategoryTotals = {
      categoryId: string;
      categoryName: string;
      parentCategoryName: string | null;
      type: "income" | "expense";
      income: number;
      expense: number;
    };

    type MonthAccumulator = {
      income: number;
      expense: number;
      subcategories: Map<string, SubcategoryTotals>;
    };

    const byMonth = new Map<string, MonthAccumulator>();

    for (const txn of filtered) {
      const month = txn.date.substring(0, 7);
      const current =
        byMonth.get(month) ?? {
          income: 0,
          expense: 0,
          subcategories: new Map<string, SubcategoryTotals>(),
        };

      if (txn.type === "income") {
        current.income += txn.amount;
      } else {
        current.expense += txn.amount;
      }

      const categoryId = txn.categoryId ?? "uncategorized";
      const category = txn.categoryId ? categoryLookup.get(txn.categoryId) : undefined;
      const categoryKey = typeof categoryId === "string" ? categoryId : String(categoryId);

      const categoryName = category?.name ?? "Uncategorized";
      const parentCategoryName = category?.parentId
        ? categoryLookup.get(category.parentId)?.name ?? null
        : null;

      const categoryType: "income" | "expense" = category?.type ?? txn.type;

      const existing = current.subcategories.get(categoryKey) ?? {
        categoryId: categoryKey,
        categoryName,
        parentCategoryName,
        type: categoryType,
        income: 0,
        expense: 0,
      };

      if (txn.type === "income") {
        existing.income += txn.amount;
      } else {
        existing.expense += txn.amount;
      }

      current.subcategories.set(categoryKey, existing);
      byMonth.set(month, current);
    }

    const monthlyData = Array.from(byMonth.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
        subcategoryBreakdown: Array.from(data.subcategories.values())
          .map((entry) => ({
            ...entry,
            net: entry.income - entry.expense,
          }))
          .sort((a, b) => (b.income + b.expense) - (a.income + a.expense)),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
    const totalExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0);

    return {
      generatedAt: Date.now(),
      periodStart: args.startDate,
      periodEnd: args.endDate,
      totalIncome,
      totalExpense,
      netSurplus: totalIncome - totalExpense,
      monthlyBreakdown: monthlyData,
      averageMonthlyIncome: monthlyData.length > 0 ? totalIncome / monthlyData.length : 0,
      averageMonthlyExpense: monthlyData.length > 0 ? totalExpense / monthlyData.length : 0,
    };
  },
});
