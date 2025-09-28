import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export type CreateTransactionInput = {
  churchId: Id<"churches">;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  fundId: Id<"funds">;
  categoryId?: Id<"categories">;
  donorId?: Id<"donors">;
  method?: string;
  reference?: string;
  giftAid: boolean;
  notes?: string;
  createdBy?: Id<"users">;
  enteredByName?: string;
  source?: "manual" | "csv" | "api";
  csvBatch?: string;
  receiptStorageId?: Id<"_storage">;
  receiptFilename?: string;
};

type DuplicateSearchArgs = {
  churchId: Id<"churches">;
  date: string;
  amount: number;
  reference?: string;
};

const toDuplicateMatches = async (
  ctx: QueryCtx | MutationCtx,
  args: DuplicateSearchArgs
) => {
  const results = await ctx.db
    .query("transactions")
    .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
    .filter((q) => q.eq(q.field("date"), args.date))
    .collect();

  return results.filter((transaction) => {
    const referenceMatch = args.reference
      ? transaction.reference?.toLowerCase() === args.reference.toLowerCase()
      : true;
    return referenceMatch && Math.abs(transaction.amount - args.amount) < 0.01;
  });
};

const insertTransaction = async (
  ctx: MutationCtx,
  args: CreateTransactionInput
) => {
  const {
    createdBy,
    enteredByName,
    source = "manual",
    receiptStorageId,
    receiptFilename,
    ...transactionValues
  } = args;

  let userId = createdBy;
  if (!userId) {
    const existingChurchUser = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", transactionValues.churchId))
      .first();

    if (existingChurchUser) {
      userId = existingChurchUser._id;
    } else {
      const placeholderEmail = `manual+${transactionValues.churchId}@churchcoin.local`;
      const placeholderUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", placeholderEmail))
        .first();

      if (placeholderUser) {
        userId = placeholderUser._id;
      } else {
        userId = await ctx.db.insert("users", {
          name: enteredByName ?? "Manual Entry",
          email: placeholderEmail,
          role: "admin",
          churchId: transactionValues.churchId,
        } satisfies Omit<Doc<"users">, "_id" | "_creationTime">);
      }
    }
  }

  if (!userId) {
    throw new Error("Unable to determine user for manual transaction");
  }

  const transactionId = await ctx.db.insert("transactions", {
    ...transactionValues,
    source,
    createdBy: userId,
    enteredByName,
    reconciled: false,
    receiptStorageId,
    receiptFilename,
  });

  const fund = await ctx.db.get(transactionValues.fundId);
  if (!fund) {
    throw new Error("Fund not found");
  }

  const balanceChange =
    transactionValues.type === "income"
      ? transactionValues.amount
      : -transactionValues.amount;
  const newBalance = fund.balance + balanceChange;

  await ctx.db.patch(transactionValues.fundId, {
    balance: newBalance,
  });

  await ctx.db.insert("auditLog", {
    churchId: transactionValues.churchId,
    userId,
    action: "CREATE_TRANSACTION",
    entityType: "transaction",
    entityId: transactionId,
    changes: {
      amount: transactionValues.amount,
      type: transactionValues.type,
      fundId: transactionValues.fundId,
    },
    timestamp: Date.now(),
  });

  return transactionId;
};

export const createTransactionInternal = insertTransaction;
export const findDuplicateTransactions = toDuplicateMatches;

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

    const fundId = args.fundId;
    if (fundId !== undefined) {
      query = ctx.db
        .query("transactions")
        .withIndex("by_fund", (q) => q.eq("fundId", fundId))
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
    createdBy: v.optional(v.id("users")),
    enteredByName: v.optional(v.string()),
    source: v.optional(
      v.union(v.literal("manual"), v.literal("csv"), v.literal("api"))
    ),
    csvBatch: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    receiptFilename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return insertTransaction(ctx, args);
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
    updatedBy: v.optional(v.id("users")),
    receiptStorageId: v.optional(v.id("_storage")),
    receiptFilename: v.optional(v.string()),
    removeReceipt: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { transactionId, updatedBy, ...updates } = args;

    const transaction = await ctx.db.get(transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    let userId = updatedBy;
    if (!userId) {
      const existingChurchUser = await ctx.db
        .query("users")
        .withIndex("by_church", (q) => q.eq("churchId", transaction.churchId))
        .first();

      if (existingChurchUser) {
        userId = existingChurchUser._id;
      } else {
        const placeholderEmail = `manual+${transaction.churchId}@churchcoin.local`;
        const placeholderUser = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", placeholderEmail))
          .first();

        if (placeholderUser) {
          userId = placeholderUser._id;
        } else {
          userId = await ctx.db.insert("users", {
            name: transaction.enteredByName ?? "Manual Entry",
            email: placeholderEmail,
            role: "admin",
            churchId: transaction.churchId,
          } satisfies Omit<Doc<"users">, "_id" | "_creationTime">);
        }
      }
    }

    const { removeReceipt, ...transactionUpdates } = updates as typeof updates & {
      removeReceipt?: boolean;
    };

    const oldAmount = transaction.amount;
    const oldType = transaction.type;
    const oldFundId = transaction.fundId;

    if (removeReceipt) {
      if (transaction.receiptStorageId) {
        await ctx.storage.delete(transaction.receiptStorageId);
      }
      transactionUpdates.receiptStorageId = undefined;
      transactionUpdates.receiptFilename = undefined;
    }

    // Update the transaction
    await ctx.db.patch(transactionId, transactionUpdates);

    // Handle fund balance changes if amount, type, or fund changed
    if (
      transactionUpdates.amount !== undefined ||
      transactionUpdates.type !== undefined ||
      transactionUpdates.fundId !== undefined
    ) {
      // Reverse old transaction impact
      const oldBalanceChange = oldType === "income" ? -oldAmount : oldAmount;
      await ctx.db.patch(oldFundId, {
        balance: (await ctx.db.get(oldFundId))!.balance + oldBalanceChange,
      });

      // Apply new transaction impact
      const newAmount = transactionUpdates.amount ?? oldAmount;
      const newType = transactionUpdates.type ?? oldType;
      const newFundId = transactionUpdates.fundId ?? oldFundId;

      const newBalanceChange = newType === "income" ? newAmount : -newAmount;
      await ctx.db.patch(newFundId, {
        balance: (await ctx.db.get(newFundId))!.balance + newBalanceChange,
      });
    }

    // Log audit trail
    await ctx.db.insert("auditLog", {
      churchId: transaction.churchId,
      userId,
      action: "UPDATE_TRANSACTION",
      entityType: "transaction",
      entityId: transactionId,
      changes: transactionUpdates,
      timestamp: Date.now(),
    });

    return transactionId;
  },
});

export const deleteTransaction = mutation({
  args: {
    transactionId: v.id("transactions"),
    deletedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    let userId = args.deletedBy;
    if (!userId) {
      const existingChurchUser = await ctx.db
        .query("users")
        .withIndex("by_church", (q) => q.eq("churchId", transaction.churchId))
        .first();

      if (existingChurchUser) {
        userId = existingChurchUser._id;
      } else {
        const placeholderEmail = `manual+${transaction.churchId}@churchcoin.local`;
        const placeholderUser = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", placeholderEmail))
          .first();

        if (placeholderUser) {
          userId = placeholderUser._id;
        } else {
          userId = await ctx.db.insert("users", {
            name: transaction.enteredByName ?? "Manual Entry",
            email: placeholderEmail,
            role: "admin",
            churchId: transaction.churchId,
          } satisfies Omit<Doc<"users">, "_id" | "_creationTime">);
        }
      }
    }

    // Reverse fund balance impact
    const balanceChange = transaction.type === "income" ? -transaction.amount : transaction.amount;
    await ctx.db.patch(transaction.fundId, {
      balance: (await ctx.db.get(transaction.fundId))!.balance + balanceChange,
    });

    if (transaction.receiptStorageId) {
      await ctx.storage.delete(transaction.receiptStorageId);
    }

    await ctx.db.delete(args.transactionId);

    await ctx.db.insert("auditLog", {
      churchId: transaction.churchId,
      userId: userId!,
      action: "DELETE_TRANSACTION",
      entityType: "transaction",
      entityId: args.transactionId,
      changes: {
        amount: transaction.amount,
        fundId: transaction.fundId,
      },
      timestamp: Date.now(),
    });
  },
});

export const findPotentialDuplicates = query({
  args: {
    churchId: v.id("churches"),
    date: v.string(),
    amount: v.number(),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return toDuplicateMatches(ctx, args);
  },
});

export const recordExpense = mutation({
  args: {
    churchId: v.id("churches"),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    fundId: v.id("funds"),
    categoryId: v.optional(v.id("categories")),
    method: v.optional(v.string()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    enteredByName: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    receiptFilename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await insertTransaction(ctx, {
      ...args,
      amount: Math.abs(args.amount),
      type: "expense",
      donorId: undefined,
      giftAid: false,
      source: "manual",
    });
  },
});

export const getLedger = query({
  args: {
    churchId: v.id("churches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .order("desc")
      .take(args.limit ?? 100);

    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const donors = await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const fundLookup = new Map(funds.map((fund) => [fund._id, fund]));
    const categoryLookup = new Map(categories.map((category) => [category._id, category]));
    const donorLookup = new Map(donors.map((donor) => [donor._id, donor]));

    return page.map((transaction: Doc<"transactions">) => ({
      transaction,
      fund: fundLookup.get(transaction.fundId) ?? null,
      category: transaction.categoryId
        ? categoryLookup.get(transaction.categoryId) ?? null
        : null,
      donor: transaction.donorId ? donorLookup.get(transaction.donorId) ?? null : null,
    }));
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
