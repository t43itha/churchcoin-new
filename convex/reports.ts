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
  },
  handler: async (ctx, args) => {
    const donors = await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .collect();

    const filtered = transactions.filter(
      (txn) => txn.date >= args.fromDate && txn.date <= args.toDate
    );

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
      return {
        donor,
        transactions: donorTxns,
        total,
      };
    });
  },
});
