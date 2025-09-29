import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all funds for a church
export const getFunds = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return funds;
  },
});

// Get fund by ID
export const getFund = query({
  args: { fundId: v.id("funds") },
  handler: async (ctx, args) => {
    const fund = await ctx.db.get(args.fundId);
    return fund;
  },
});

// Create a new fund
export const createFund = mutation({
  args: {
    churchId: v.id("churches"),
    name: v.string(),
    type: v.union(
      v.literal("general"),
      v.literal("restricted"),
      v.literal("designated")
    ),
    description: v.optional(v.string()),
    restrictions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const fundId = await ctx.db.insert("funds", {
      churchId: args.churchId,
      name: args.name,
      type: args.type,
      balance: 0,
      description: args.description,
      restrictions: args.restrictions,
      isActive: true,
    });

    return fundId;
  },
});

export const updateFund = mutation({
  args: {
    fundId: v.id("funds"),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(v.literal("general"), v.literal("restricted"), v.literal("designated"))
    ),
    description: v.optional(v.union(v.string(), v.null())),
    restrictions: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { fundId, ...updates } = args;
    const fund = await ctx.db.get(fundId);
    if (!fund) {
      throw new Error("Fund not found");
    }

    const patch: Partial<Doc<"funds">> = {};

    if (updates.name !== undefined) {
      patch.name = updates.name;
    }

    if (updates.type !== undefined) {
      patch.type = updates.type;
    }

    if (updates.description !== undefined) {
      patch.description = updates.description ?? undefined;
    }

    if (updates.restrictions !== undefined) {
      patch.restrictions = updates.restrictions ?? undefined;
    }

    if (Object.keys(patch).length === 0) {
      return fundId;
    }

    await ctx.db.patch(fundId, patch);

    return fundId;
  },
});

// Update fund balance
export const updateFundBalance = mutation({
  args: {
    fundId: v.id("funds"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const fund = await ctx.db.get(args.fundId);
    if (!fund) {
      throw new Error("Fund not found");
    }

    const newBalance = fund.balance + args.amount;

    await ctx.db.patch(args.fundId, {
      balance: newBalance,
    });

    return newBalance;
  },
});

// Archive fund (soft delete)
export const archiveFund = mutation({
  args: { fundId: v.id("funds") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fundId, {
      isActive: false,
    });
  },
});

// Simple list for dashboard without church context (for demo)
export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("funds"),
    name: v.string(),
    type: v.union(v.literal("general"), v.literal("restricted"), v.literal("designated")),
    balance: v.number(),
    description: v.optional(v.string()),
    restrictions: v.optional(v.string()),
    isActive: v.boolean(),
    churchId: v.id("churches"),
    _creationTime: v.number(),
  })),
  handler: async (ctx) => {
    return await ctx.db
      .query("funds")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get total balance across all funds
export const getTotalBalance = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const funds = await ctx.db
      .query("funds")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return funds.reduce((total, fund) => total + fund.balance, 0);
  },
});

export const getFundsOverview = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const summaries = new Map<Doc<"funds">["_id"], {
      fund: Doc<"funds">;
      incomeTotal: number;
      expenseTotal: number;
      lastTransactionDate: string | null;
      transactions: { transaction: Doc<"transactions">; delta: number }[];
      deltaSum: number;
    }>();

    for (const fund of funds) {
      summaries.set(fund._id, {
        fund,
        incomeTotal: 0,
        expenseTotal: 0,
        lastTransactionDate: null,
        transactions: [],
        deltaSum: 0,
      });
    }

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .order("asc")
      .collect();

    for (const transaction of transactions) {
      const summary = summaries.get(transaction.fundId);
      if (!summary) {
        continue;
      }

      const delta = transaction.type === "income" ? transaction.amount : -transaction.amount;
      summary.transactions.push({ transaction, delta });
      summary.deltaSum += delta;

      if (transaction.type === "income") {
        summary.incomeTotal += transaction.amount;
      } else {
        summary.expenseTotal += transaction.amount;
      }

      summary.lastTransactionDate = transaction.date;
    }

    return Array.from(summaries.values()).map((summary) => {
      let running = summary.fund.balance - summary.deltaSum;
      const runningBalance = summary.transactions.map(({ transaction, delta }) => {
        running += delta;
        return {
          transactionId: transaction._id,
          date: transaction.date,
          description: transaction.description,
          type: transaction.type,
          amount: transaction.amount,
          balance: running,
        };
      });

      return {
        fund: summary.fund,
        incomeTotal: summary.incomeTotal,
        expenseTotal: summary.expenseTotal,
        lastTransactionDate: summary.lastTransactionDate,
        runningBalance,
      };
    });
  },
});
