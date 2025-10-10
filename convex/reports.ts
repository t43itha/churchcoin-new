import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

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
    donorIds: v.optional(v.array(v.id("donors"))),
  },
  handler: async (ctx, args) => {
    const donors = await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const donorIdSet = args.donorIds ? new Set<Id<"donors">>(args.donorIds) : null;

    const targetDonors = donorIdSet
      ? donors.filter((donor) => donorIdSet.has(donor._id))
      : donors;

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

    if (donorIdSet) {
      filtered = filtered.filter((txn) => txn.donorId && donorIdSet.has(txn.donorId));
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
        if (donorIdSet && !donorIdSet.has(pledge.donorId)) {
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

    const byDonor = new Map<Id<"donors">, typeof filtered>();
    for (const txn of filtered) {
      if (!txn.donorId) continue;
      if (donorIdSet && !donorIdSet.has(txn.donorId)) continue;
      const list = byDonor.get(txn.donorId) ?? [];
      list.push(txn);
      byDonor.set(txn.donorId, list);
    }

    return targetDonors.map((donor) => {
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

export const getDonorStatementCount = query({
  args: {
    churchId: v.id("churches"),
    fromDate: v.string(),
    toDate: v.string(),
    fundType: v.optional(
      v.union(
        v.literal("general"),
        v.literal("restricted"),
        v.literal("designated"),
        v.literal("all"),
      ),
    ),
    donorIds: v.optional(v.array(v.id("donors"))),
  },
  handler: async (ctx, args) => {
    const donors = await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const donorIdSet = args.donorIds ? new Set<Id<"donors">>(args.donorIds) : null;
    const targetDonors = donorIdSet
      ? donors.filter((donor) => donorIdSet.has(donor._id))
      : donors;

    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const fundLookup = new Map(funds.map((fund) => [fund._id, fund] as const));

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .collect();

    let filtered = transactions.filter(
      (txn) => txn.date >= args.fromDate && txn.date <= args.toDate,
    );

    if (args.fundType && args.fundType !== "all") {
      filtered = filtered.filter((txn) => {
        const fund = fundLookup.get(txn.fundId);
        return fund?.type === args.fundType;
      });
    }

    if (donorIdSet) {
      filtered = filtered.filter((txn) => txn.donorId && donorIdSet.has(txn.donorId));
    }

    const totalsByDonor = new Map<Id<"donors">, number>();
    for (const txn of filtered) {
      if (!txn.donorId) continue;
      const prev = totalsByDonor.get(txn.donorId) ?? 0;
      totalsByDonor.set(txn.donorId, prev + txn.amount);
    }

    const count = targetDonors.reduce((acc, donor) => {
      const total = totalsByDonor.get(donor._id) ?? 0;
      return acc + (total > 0 ? 1 : 0);
    }, 0);

    return { count };
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

// Period-based reports for enhanced financial workflow

export const getHierarchicalIncomeReport = query({
  args: { periodId: v.id("financialPeriods") },
  returns: v.object({
    totalIncome: v.number(),
    mainCategories: v.array(v.object({
      id: v.string(),
      name: v.string(),
      total: v.number(),
      isRestricted: v.boolean(),
      subcategories: v.array(v.object({
        id: v.string(),
        name: v.string(),
        amount: v.number(),
      })),
    })),
  }),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) throw new Error("Period not found");

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_period", (q) =>
        q.eq("churchId", period.churchId)
         .eq("periodYear", period.year)
         .eq("periodMonth", period.month)
      )
      .filter((q) => q.eq(q.field("type"), "income"))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_church", (q) => q.eq("churchId", period.churchId))
      .filter((q) => q.eq(q.field("type"), "income"))
      .collect();

    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", period.churchId))
      .collect();

    const fundLookup = new Map(funds.map(f => [f._id, f]));
    const categoryLookup = new Map(categories.map(c => [c._id, c]));

    // Build hierarchy: main categories with subcategories
    const mainCategoriesMap = new Map<string, {
      id: string;
      name: string;
      total: number;
      isRestricted: boolean;
      subcategories: Map<string, { id: string; name: string; amount: number }>;
    }>();

    for (const txn of transactions) {
      const fund = fundLookup.get(txn.fundId);
      const fundType = fund?.type ?? "general";
      const isRestricted = fundType === "restricted";

      // ONLY include categorised general/designated fund income
      // Restricted funds are tracked separately, not in income by category
      if (isRestricted || !txn.categoryId) {
        continue;
      }

      const category = categoryLookup.get(txn.categoryId);
      if (!category) continue;

      let mainCategoryId: string;
      let mainCategoryName: string;
      let subcategoryId: string;
      let subcategoryName: string;

      if (category.isSubcategory && category.parentId) {
        const parent = categoryLookup.get(category.parentId);
        mainCategoryId = category.parentId;
        mainCategoryName = parent?.name ?? "Unknown";
        subcategoryId = category._id;
        subcategoryName = category.name;
      } else {
        mainCategoryId = category._id;
        mainCategoryName = category.name;
        subcategoryId = category._id;
        subcategoryName = category.name;
      }

      let mainCat = mainCategoriesMap.get(mainCategoryId);
      if (!mainCat) {
        mainCat = {
          id: mainCategoryId,
          name: mainCategoryName,
          total: 0,
          isRestricted: false, // All are general/designated funds
          subcategories: new Map(),
        };
        mainCategoriesMap.set(mainCategoryId, mainCat);
      }

      mainCat.total += txn.amount;

      let subcat = mainCat.subcategories.get(subcategoryId);
      if (!subcat) {
        subcat = { id: subcategoryId, name: subcategoryName, amount: 0 };
        mainCat.subcategories.set(subcategoryId, subcat);
      }
      subcat.amount += txn.amount;
    }

    // Calculate totalIncome from the breakdown to ensure it matches
    const totalIncome = Array.from(mainCategoriesMap.values()).reduce(
      (sum, cat) => sum + cat.total,
      0
    );

    return {
      totalIncome,
      mainCategories: Array.from(mainCategoriesMap.values())
        .map(main => ({
          ...main,
          subcategories: Array.from(main.subcategories.values())
            .sort((a, b) => b.amount - a.amount),
        }))
        .sort((a, b) => b.total - a.total),
    };
  },
});

export const getHierarchicalExpenditureReport = query({
  args: { periodId: v.id("financialPeriods") },
  returns: v.object({
    totalExpenditure: v.number(),
    mainCategories: v.array(v.object({
      id: v.string(),
      name: v.string(),
      total: v.number(),
      subcategories: v.array(v.object({
        id: v.string(),
        name: v.string(),
        amount: v.number(),
      })),
    })),
  }),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) throw new Error("Period not found");

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_period", (q) =>
        q.eq("churchId", period.churchId)
         .eq("periodYear", period.year)
         .eq("periodMonth", period.month)
      )
      .filter((q) => q.eq(q.field("type"), "expense"))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_church", (q) => q.eq("churchId", period.churchId))
      .filter((q) => q.eq(q.field("type"), "expense"))
      .collect();

    const categoryLookup = new Map(categories.map(c => [c._id, c]));

    const mainCategoriesMap = new Map<string, {
      id: string;
      name: string;
      total: number;
      subcategories: Map<string, { id: string; name: string; amount: number }>;
    }>();

    for (const txn of transactions) {
      if (!txn.categoryId) continue;

      const category = categoryLookup.get(txn.categoryId);
      if (!category) continue;

      let mainCategoryId: string;
      let mainCategoryName: string;
      let subcategoryId: string;
      let subcategoryName: string;

      if (category.isSubcategory && category.parentId) {
        const parent = categoryLookup.get(category.parentId);
        mainCategoryId = category.parentId;
        mainCategoryName = parent?.name ?? "Unknown";
        subcategoryId = category._id;
        subcategoryName = category.name;
      } else {
        mainCategoryId = category._id;
        mainCategoryName = category.name;
        subcategoryId = category._id;
        subcategoryName = category.name;
      }

      let mainCat = mainCategoriesMap.get(mainCategoryId);
      if (!mainCat) {
        mainCat = {
          id: mainCategoryId,
          name: mainCategoryName,
          total: 0,
          subcategories: new Map(),
        };
        mainCategoriesMap.set(mainCategoryId, mainCat);
      }

      mainCat.total += txn.amount;

      let subcat = mainCat.subcategories.get(subcategoryId);
      if (!subcat) {
        subcat = { id: subcategoryId, name: subcategoryName, amount: 0 };
        mainCat.subcategories.set(subcategoryId, subcat);
      }
      subcat.amount += txn.amount;
    }

    const totalExpenditure = transactions.reduce((sum, txn) => sum + txn.amount, 0);

    return {
      totalExpenditure,
      mainCategories: Array.from(mainCategoriesMap.values())
        .map(main => ({
          ...main,
          subcategories: Array.from(main.subcategories.values())
            .sort((a, b) => b.amount - a.amount),
        }))
        .sort((a, b) => b.total - a.total),
    };
  },
});

export const getWeeklySummaryReport = query({
  args: { periodId: v.id("financialPeriods") },
  returns: v.object({
    weeklyData: v.array(v.object({
      weekEnding: v.string(),
      general: v.number(),
      restricted: v.number(),
      total: v.number(),
      breakdown: v.array(v.object({
        category: v.string(),
        amount: v.number(),
        fundType: v.string(),
      })),
    })),
    totals: v.object({
      general: v.number(),
      restricted: v.number(),
      total: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) throw new Error("Period not found");

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_period", (q) =>
        q.eq("churchId", period.churchId)
         .eq("periodYear", period.year)
         .eq("periodMonth", period.month)
      )
      .filter((q) => q.eq(q.field("type"), "income"))
      .collect();

    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", period.churchId))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_church", (q) => q.eq("churchId", period.churchId))
      .collect();

    const fundLookup = new Map(funds.map(f => [f._id, f]));
    const categoryLookup = new Map(categories.map(c => [c._id, c]));

    const weeklyMap = new Map<string, {
      general: number;
      restricted: number;
      breakdown: Map<string, { category: string; amount: number; fundType: string }>;
    }>();

    for (const txn of transactions) {
      const weekEnding = txn.weekEnding || "Unknown";
      const fund = fundLookup.get(txn.fundId);
      const fundType = fund?.type ?? "general";
      const isRestricted = fundType === "restricted";

      // Skip uncategorised general/designated fund income (not counted in totals)
      if (!isRestricted && !txn.categoryId) {
        continue;
      }

      const category = txn.categoryId ? categoryLookup.get(txn.categoryId) : undefined;
      const categoryName = category?.name ?? fund?.name ?? "Unknown";

      let week = weeklyMap.get(weekEnding);
      if (!week) {
        week = { general: 0, restricted: 0, breakdown: new Map() };
        weeklyMap.set(weekEnding, week);
      }

      if (isRestricted) {
        week.restricted += txn.amount;
      } else {
        week.general += txn.amount;
      }

      const key = `${categoryName}-${fundType}`;
      let item = week.breakdown.get(key);
      if (!item) {
        item = { category: categoryName, amount: 0, fundType };
        week.breakdown.set(key, item);
      }
      item.amount += txn.amount;
    }

    let totalGeneral = 0;
    let totalRestricted = 0;

    const weeklyData = Array.from(weeklyMap.entries())
      .map(([weekEnding, data]) => {
        totalGeneral += data.general;
        totalRestricted += data.restricted;
        return {
          weekEnding,
          general: data.general,
          restricted: data.restricted,
          total: data.general + data.restricted,
          breakdown: Array.from(data.breakdown.values())
            .sort((a, b) => b.amount - a.amount),
        };
      })
      .sort((a, b) => a.weekEnding.localeCompare(b.weekEnding));

    return {
      weeklyData,
      totals: {
        general: totalGeneral,
        restricted: totalRestricted,
        total: totalGeneral + totalRestricted,
      },
    };
  },
});

export const getPeriodOverview = query({
  args: { periodId: v.id("financialPeriods") },
  returns: v.object({
    totalIncome: v.number(),
    totalExpenditure: v.number(),
    netPosition: v.number(),
    fundSegregation: v.object({
      general: v.number(),
      restricted: v.number(),
    }),
    restrictedFunds: v.array(v.object({
      fundId: v.id("funds"),
      fundName: v.string(),
      amount: v.number(),
    })),
    generalBreakdown: v.object({
      categories: v.array(v.object({
        categoryId: v.id("categories"),
        categoryName: v.string(),
        bankAmount: v.number(),
        cashAmount: v.number(),
        combinedTotal: v.number(),
      })),
      subtotal: v.object({
        bankAmount: v.number(),
        cashAmount: v.number(),
        combinedTotal: v.number(),
      }),
    }),
    restrictedBreakdown: v.object({
      funds: v.array(v.object({
        fundId: v.id("funds"),
        fundName: v.string(),
        bankAmount: v.number(),
        cashAmount: v.number(),
        combinedTotal: v.number(),
      })),
      subtotal: v.object({
        bankAmount: v.number(),
        cashAmount: v.number(),
        combinedTotal: v.number(),
      }),
    }),
  }),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) throw new Error("Period not found");

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_period", (q) =>
        q.eq("churchId", period.churchId)
         .eq("periodYear", period.year)
         .eq("periodMonth", period.month)
      )
      .collect();

    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", period.churchId))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_church", (q) => q.eq("churchId", period.churchId))
      .collect();

    const fundLookup = new Map(funds.map(f => [f._id, f]));
    const categoryLookup = new Map(categories.map(c => [c._id, c]));

    let totalIncome = 0;
    let totalExpenditure = 0;
    let general = 0;
    let restricted = 0;

    // Track individual restricted fund amounts
    const restrictedFundAmounts = new Map<Id<"funds">, number>();

    // Track general fund breakdown by category (bank vs cash)
    type CategoryBreakdown = { bankAmount: number; cashAmount: number };
    const generalCategoryBreakdown = new Map<Id<"categories">, CategoryBreakdown>();
    let generalSubtotalBank = 0;
    let generalSubtotalCash = 0;

    // Track restricted fund breakdown (bank vs cash)
    type FundBreakdown = { bankAmount: number; cashAmount: number };
    const restrictedFundBreakdown = new Map<Id<"funds">, FundBreakdown>();
    let restrictedSubtotalBank = 0;
    let restrictedSubtotalCash = 0;

    for (const txn of transactions) {
      if (txn.type === "income") {
        totalIncome += txn.amount;
      } else {
        totalExpenditure += txn.amount;
      }

      const fund = fundLookup.get(txn.fundId);
      const fundType = fund?.type ?? "general";
      const isCash = txn.method?.toLowerCase() === "cash";
      const amount = txn.amount;

      // Count towards fund type - ONLY INCOME for fund segregation
      if (fundType === "restricted") {
        // Only count income in fund segregation
        if (txn.type === "income") {
          restricted += amount;
          // Track individual restricted fund
          const currentAmount = restrictedFundAmounts.get(txn.fundId) ?? 0;
          restrictedFundAmounts.set(txn.fundId, currentAmount + amount);

          // Track restricted fund breakdown (bank vs cash) - only income
          const breakdown = restrictedFundBreakdown.get(txn.fundId) ?? { bankAmount: 0, cashAmount: 0 };
          if (isCash) {
            breakdown.cashAmount += amount;
            restrictedSubtotalCash += amount;
          } else {
            breakdown.bankAmount += amount;
            restrictedSubtotalBank += amount;
          }
          restrictedFundBreakdown.set(txn.fundId, breakdown);
        }
      } else {
        // Only count categorised income in fund segregation
        if (txn.type === "income" && txn.categoryId) {
          general += amount;

          // Track general fund breakdown by category
          const breakdown = generalCategoryBreakdown.get(txn.categoryId) ?? { bankAmount: 0, cashAmount: 0 };
          if (isCash) {
            breakdown.cashAmount += amount;
            generalSubtotalCash += amount;
          } else {
            breakdown.bankAmount += amount;
            generalSubtotalBank += amount;
          }
          generalCategoryBreakdown.set(txn.categoryId, breakdown);
        }
      }
    }

    // Build restricted funds breakdown
    const restrictedFunds = Array.from(restrictedFundAmounts.entries())
      .map(([fundId, amount]) => {
        const fund = fundLookup.get(fundId);
        return {
          fundId,
          fundName: fund?.name ?? "Unknown Fund",
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending

    // Build general breakdown
    const generalBreakdownCategories = Array.from(generalCategoryBreakdown.entries())
      .map(([categoryId, breakdown]) => {
        const category = categoryLookup.get(categoryId);
        return {
          categoryId,
          categoryName: category?.name ?? "Unknown Category",
          bankAmount: breakdown.bankAmount,
          cashAmount: breakdown.cashAmount,
          combinedTotal: breakdown.bankAmount + breakdown.cashAmount,
        };
      })
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName)); // Sort by name

    // Build restricted breakdown
    const restrictedBreakdownFunds = Array.from(restrictedFundBreakdown.entries())
      .map(([fundId, breakdown]) => {
        const fund = fundLookup.get(fundId);
        return {
          fundId,
          fundName: fund?.name ?? "Unknown Fund",
          bankAmount: breakdown.bankAmount,
          cashAmount: breakdown.cashAmount,
          combinedTotal: breakdown.bankAmount + breakdown.cashAmount,
        };
      })
      .sort((a, b) => a.fundName.localeCompare(b.fundName)); // Sort by name

    return {
      totalIncome,
      totalExpenditure,
      netPosition: totalIncome - totalExpenditure,
      fundSegregation: {
        general,
        restricted,
      },
      restrictedFunds,
      generalBreakdown: {
        categories: generalBreakdownCategories,
        subtotal: {
          bankAmount: generalSubtotalBank,
          cashAmount: generalSubtotalCash,
          combinedTotal: generalSubtotalBank + generalSubtotalCash,
        },
      },
      restrictedBreakdown: {
        funds: restrictedBreakdownFunds,
        subtotal: {
          bankAmount: restrictedSubtotalBank,
          cashAmount: restrictedSubtotalCash,
          combinedTotal: restrictedSubtotalBank + restrictedSubtotalCash,
        },
      },
    };
  },
});

export const getReviewQueue = query({
  args: { periodId: v.id("financialPeriods") },
  returns: v.array(v.object({
    _id: v.id("transactions"),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    type: v.union(v.literal("income"), v.literal("expense")),
    confidence: v.optional(v.number()),
    needsReview: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) throw new Error("Period not found");

    const [transactions, funds] = await Promise.all([
      ctx.db
        .query("transactions")
        .withIndex("by_period", (q) =>
          q.eq("churchId", period.churchId)
           .eq("periodYear", period.year)
           .eq("periodMonth", period.month)
        )
        .collect(),
      ctx.db
        .query("funds")
        .withIndex("by_church", (q) => q.eq("churchId", period.churchId))
        .collect(),
    ]);

    const fundLookup = new Map(funds.map(f => [f._id, f]));

    // Priority 1: Uncategorised (only for general/designated funds)
    // Priority 2: Needs review flag (low confidence)
    const reviewQueue = transactions
      .filter(txn => {
        const fund = fundLookup.get(txn.fundId);
        const fundType = fund?.type ?? "general";

        // Show if explicitly flagged for review
        if (txn.needsReview) return true;

        // Show if uncategorised AND in a general/designated fund
        // Restricted funds are tracked by fund, not category, so don't need categories
        if (!txn.categoryId && fundType !== "restricted") return true;

        return false;
      })
      .sort((a, b) => {
        // Uncategorised first
        if (!a.categoryId && b.categoryId) return -1;
        if (a.categoryId && !b.categoryId) return 1;
        // Then by date
        return a.date.localeCompare(b.date);
      })
      .map(txn => ({
        _id: txn._id,
        date: txn.date,
        description: txn.description,
        amount: txn.amount,
        type: txn.type,
        confidence: undefined, // TODO: Add confidence field to transactions
        needsReview: !txn.categoryId || txn.needsReview || false,
      }));

    return reviewQueue;
  },
});
