import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get transactions for a church with pagination
export const getTransactions = query({
  args: {
    churchId: v.id("churches"),
    fundId: v.optional(v.id("funds")),
    limit: v.optional(v.number()),
    paginationOpts: v.optional(v.object({
      numItems: v.number(),
      cursor: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .order("desc");

    if (args.fundId) {
      query = ctx.db
        .query("transactions")
        .withIndex("by_fund", (q) => q.eq("fundId", args.fundId))
        .order("desc");
    }

    if (args.paginationOpts) {
      const { numItems, cursor } = args.paginationOpts;
      return await query.paginate({
        numItems,
        cursor: cursor ? cursor : null,
      });
    }

    return {
      page: await query.take(args.limit || 50),
      isDone: false,
      continueCursor: null,
    };
  },
});

// Get transaction by ID
export const getTransaction = query({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.transactionId);
  },
});

// Create a new transaction
export const createTransaction = mutation({
  args: {
    churchId: v.id("churches"),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    type: v.union(v.literal("income"), v.literal("expense")),
    fundId: v.id("funds"),
    categoryId: v.optional(v.id("categories")),
    donorId: v.optional(v.id("donors")),
    method: v.optional(v.string()),
    reference: v.optional(v.string()),
    giftAid: v.boolean(),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    source: v.union(
      v.literal("manual"),
      v.literal("csv"),
      v.literal("api")
    ),
    csvBatch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create the transaction
    const transactionId = await ctx.db.insert("transactions", {
      ...args,
      reconciled: false,
    });

    // Update fund balance
    const fund = await ctx.db.get(args.fundId);
    if (!fund) {
      throw new Error("Fund not found");
    }

    const balanceChange = args.type === "income" ? args.amount : -args.amount;
    const newBalance = fund.balance + balanceChange;

    await ctx.db.patch(args.fundId, {
      balance: newBalance,
    });

    // Log audit trail
    await ctx.db.insert("auditLog", {
      churchId: args.churchId,
      userId: args.createdBy,
      action: "CREATE_TRANSACTION",
      entityType: "transaction",
      entityId: transactionId,
      changes: {
        amount: args.amount,
        type: args.type,
        fundId: args.fundId,
      },
      timestamp: Date.now(),
    });

    return transactionId;
  },
});

// Update a transaction
export const updateTransaction = mutation({
  args: {
    transactionId: v.id("transactions"),
    date: v.optional(v.string()),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
    fundId: v.optional(v.id("funds")),
    categoryId: v.optional(v.id("categories")),
    donorId: v.optional(v.id("donors")),
    method: v.optional(v.string()),
    reference: v.optional(v.string()),
    giftAid: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { transactionId, updatedBy, ...updates } = args;

    const transaction = await ctx.db.get(transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const oldAmount = transaction.amount;
    const oldType = transaction.type;
    const oldFundId = transaction.fundId;

    // Update the transaction
    await ctx.db.patch(transactionId, updates);

    // Handle fund balance changes if amount, type, or fund changed
    if (updates.amount !== undefined || updates.type !== undefined || updates.fundId !== undefined) {
      // Reverse old transaction impact
      const oldBalanceChange = oldType === "income" ? -oldAmount : oldAmount;
      await ctx.db.patch(oldFundId, {
        balance: (await ctx.db.get(oldFundId))!.balance + oldBalanceChange,
      });

      // Apply new transaction impact
      const newAmount = updates.amount ?? oldAmount;
      const newType = updates.type ?? oldType;
      const newFundId = updates.fundId ?? oldFundId;

      const newBalanceChange = newType === "income" ? newAmount : -newAmount;
      await ctx.db.patch(newFundId, {
        balance: (await ctx.db.get(newFundId))!.balance + newBalanceChange,
      });
    }

    // Log audit trail
    await ctx.db.insert("auditLog", {
      churchId: transaction.churchId,
      userId: updatedBy,
      action: "UPDATE_TRANSACTION",
      entityType: "transaction",
      entityId: transactionId,
      changes: updates,
      timestamp: Date.now(),
    });

    return transactionId;
  },
});

// Mark transaction as reconciled
export const reconcileTransaction = mutation({
  args: {
    transactionId: v.id("transactions"),
    reconciled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      reconciled: args.reconciled,
    });
  },
});

// Get unreconciled transactions
export const getUnreconciledTransactions = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_reconciled", (q) =>
        q.eq("churchId", args.churchId).eq("reconciled", false)
      )
      .collect();
  },
});