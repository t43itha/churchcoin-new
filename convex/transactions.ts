import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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
  pendingStatus?: "none" | "pending" | "cleared";
  pendingReason?: string;
  expectedClearDate?: string;
};

type DuplicateSearchArgs = {
  churchId: Id<"churches">;
  date: string;
  amount: number;
  reference?: string;
};

// Helper functions for period calculation
function parseDateToUTC(dateString: string): Date {
  // Parse DD/MM/YYYY or ISO format to UTC date
  if (dateString.includes('/')) {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  return new Date(dateString);
}

function calculatePeriodFields(dateString: string): {
  periodMonth: number;
  periodYear: number;
  weekEnding: string;
} {
  const date = parseDateToUTC(dateString);
  const month = date.getUTCMonth() + 1; // 1-12
  const year = date.getUTCFullYear();

  // Calculate week ending (Sunday)
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() + daysUntilSunday);

  // Format as DD/MM/YYYY
  const day = String(sunday.getUTCDate()).padStart(2, '0');
  const sundayMonth = String(sunday.getUTCMonth() + 1).padStart(2, '0');
  const sundayYear = sunday.getUTCFullYear();
  const weekEnding = `${day}/${sundayMonth}/${sundayYear}`;

  return {
    periodMonth: month,
    periodYear: year,
    weekEnding,
  };
}

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
    pendingStatus = "none",
    pendingReason,
    expectedClearDate,
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
          role: "secured_guest",
          churchId: transactionValues.churchId,
        } satisfies Omit<Doc<"users">, "_id" | "_creationTime">);
      }
    }
  }

  if (!userId) {
    throw new Error("Unable to determine user for manual transaction");
  }

  // Calculate period fields from transaction date
  const periodFields = calculatePeriodFields(transactionValues.date);

  // Create or get the financial period
  await ctx.runMutation(api.financialPeriods.createOrGetPeriod, {
    churchId: transactionValues.churchId,
    month: periodFields.periodMonth,
    year: periodFields.periodYear,
  });

  const transactionId = await ctx.db.insert("transactions", {
    ...transactionValues,
    source,
    createdBy: userId,
    enteredByName,
    reconciled: false,
    receiptStorageId,
    receiptFilename,
    pendingStatus,
    pendingReason,
    expectedClearDate,
    clearedAt: pendingStatus === "cleared" ? Date.now() : undefined,
    // Add period tracking fields
    periodMonth: periodFields.periodMonth,
    periodYear: periodFields.periodYear,
    weekEnding: periodFields.weekEnding,
  });

  if (pendingStatus === "pending") {
    await ctx.db.insert("pendingTransactions", {
      churchId: transactionValues.churchId,
      transactionId,
      reason: pendingReason ?? "Awaiting clearance",
      expectedClearDate,
      createdAt: Date.now(),
      resolvedAt: undefined,
    });
  }

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
    pendingStatus: v.optional(
      v.union(v.literal("none"), v.literal("pending"), v.literal("cleared"))
    ),
    pendingReason: v.optional(v.string()),
    expectedClearDate: v.optional(v.string()),
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
    pendingStatus: v.optional(
      v.union(v.literal("none"), v.literal("pending"), v.literal("cleared"))
    ),
    pendingReason: v.optional(v.string()),
    expectedClearDate: v.optional(v.string()),
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
            role: "secured_guest",
            churchId: transaction.churchId,
          } satisfies Omit<Doc<"users">, "_id" | "_creationTime">);
        }
      }
    }

    const { removeReceipt, ...rawUpdates } = updates as typeof updates & {
      removeReceipt?: boolean;
    };

    const transactionUpdates: Partial<Doc<"transactions">> = {
      ...rawUpdates,
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

    if (rawUpdates.pendingStatus !== undefined) {
      transactionUpdates.clearedAt =
        rawUpdates.pendingStatus === "cleared" ? Date.now() : undefined;
    }

    // Update the transaction
    await ctx.db.patch(transactionId, transactionUpdates);

    if (
      rawUpdates.pendingStatus !== undefined ||
      rawUpdates.pendingReason !== undefined ||
      rawUpdates.expectedClearDate !== undefined
    ) {
      const pendingRecord = await ctx.db
        .query("pendingTransactions")
        .withIndex("by_transaction", (q) => q.eq("transactionId", transactionId))
        .first();

      const nextStatus =
        (rawUpdates.pendingStatus ?? transaction.pendingStatus ?? "none") as
          | "none"
          | "pending"
          | "cleared";
      const nextReason =
        rawUpdates.pendingReason ?? transaction.pendingReason ?? undefined;
      const nextExpectedClearDate =
        rawUpdates.expectedClearDate ?? transaction.expectedClearDate ?? undefined;

      if (nextStatus === "pending") {
        if (pendingRecord) {
          await ctx.db.patch(pendingRecord._id, {
            reason: nextReason ?? pendingRecord.reason,
            expectedClearDate: nextExpectedClearDate,
            resolvedAt: undefined,
          });
        } else {
          await ctx.db.insert("pendingTransactions", {
            churchId: transaction.churchId,
            transactionId,
            reason: nextReason ?? "Awaiting clearance",
            expectedClearDate: nextExpectedClearDate,
            createdAt: Date.now(),
            resolvedAt: undefined,
          });
        }
      } else if (pendingRecord) {
        if (nextStatus === "cleared") {
          await ctx.db.patch(pendingRecord._id, {
            resolvedAt: Date.now(),
          });
        } else {
          await ctx.db.delete(pendingRecord._id);
        }
      }
    }


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

    // Note: Pledge fulfillment recalculation
    // When donorId changes on an income transaction, pledge fulfillment is automatically
    // recalculated via Convex's reactive queries (getFundsOverview reads from transactions
    // and fundPledges). No explicit trigger needed - the UI will update automatically.

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
            role: "secured_guest",
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
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const pendingRecord = await ctx.db
      .query("pendingTransactions")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .first();

    if (args.reconciled) {
      await ctx.db.patch(args.transactionId, {
        reconciled: true,
        pendingStatus: transaction.pendingStatus === "pending" ? "cleared" : transaction.pendingStatus,
        clearedAt: Date.now(),
      });

      if (pendingRecord) {
        await ctx.db.patch(pendingRecord._id, {
          resolvedAt: Date.now(),
        });
      }
    } else {
      await ctx.db.patch(args.transactionId, {
        reconciled: false,
        pendingStatus: transaction.pendingStatus === "cleared" ? "pending" : transaction.pendingStatus,
        clearedAt: undefined,
      });

      if (pendingRecord && pendingRecord.resolvedAt) {
        await ctx.db.patch(pendingRecord._id, {
          resolvedAt: undefined,
        });
      }
    }
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
export const listPendingTransactions = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pendingTransactions")
      .withIndex("by_church_status", (q) =>
        q.eq("churchId", args.churchId).eq("resolvedAt", undefined)
      )
      .collect();

    if (pending.length === 0) {
      return [] as {
        record: Doc<"pendingTransactions">;
        transaction: Doc<"transactions"> | null;
      }[];
    }

    const transactionIds = pending.map((record) => record.transactionId);
    const transactions = await Promise.all(
      transactionIds.map((id) => ctx.db.get(id))
    );

    return pending.map((record, index) => ({
      record,
      transaction: transactions[index] ?? null,
    }));
  },
});

export const markTransactionPending = mutation({
  args: {
    transactionId: v.id("transactions"),
    reason: v.string(),
    expectedClearDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await ctx.db.patch(args.transactionId, {
      pendingStatus: "pending",
      pendingReason: args.reason,
      expectedClearDate: args.expectedClearDate,
      clearedAt: undefined,
    });

    const existing = await ctx.db
      .query("pendingTransactions")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        reason: args.reason,
        expectedClearDate: args.expectedClearDate,
        resolvedAt: undefined,
      });
    } else {
      await ctx.db.insert("pendingTransactions", {
        churchId: transaction.churchId,
        transactionId: args.transactionId,
        reason: args.reason,
        expectedClearDate: args.expectedClearDate,
        createdAt: Date.now(),
        resolvedAt: undefined,
      });
    }

    return args.transactionId;
  },
});

export const resolvePendingTransaction = mutation({
  args: {
    transactionId: v.id("transactions"),
    markCleared: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const pendingRecord = await ctx.db
      .query("pendingTransactions")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .first();

    const shouldClear = Boolean(args.markCleared);

    await ctx.db.patch(args.transactionId, {
      pendingStatus: shouldClear ? "cleared" : "none",
      pendingReason: shouldClear ? transaction.pendingReason : undefined,
      expectedClearDate: shouldClear ? transaction.expectedClearDate : undefined,
      clearedAt: shouldClear ? Date.now() : undefined,
    });

    if (pendingRecord) {
      if (shouldClear) {
        await ctx.db.patch(pendingRecord._id, {
          resolvedAt: Date.now(),
        });
      } else {
        await ctx.db.delete(pendingRecord._id);
      }
    }

    return args.transactionId;
  },
});

// Optimized period-based query for multi-period view
export const getLedgerByPeriod = query({
  args: {
    churchId: v.id("churches"),
    periodYear: v.number(),
    periodMonth: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use indexed query - super fast!
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_period", (q) =>
        q.eq("churchId", args.churchId)
         .eq("periodYear", args.periodYear)
         .eq("periodMonth", args.periodMonth)
      )
      .order("desc")
      .take(args.limit ?? 100);

    // OPTIMIZATION: Only fetch entities that are actually used
    const usedFundIds = new Set(transactions.map(t => t.fundId));
    const usedCategoryIds = new Set(
      transactions.map(t => t.categoryId).filter(Boolean) as Id<"categories">[]
    );
    const usedDonorIds = new Set(
      transactions.map(t => t.donorId).filter(Boolean) as Id<"donors">[]
    );

    // Parallel fetch only what we need
    const [funds, categories, donors] = await Promise.all([
      Promise.all(Array.from(usedFundIds).map(id => ctx.db.get(id))),
      usedCategoryIds.size > 0
        ? Promise.all(Array.from(usedCategoryIds).map(id => ctx.db.get(id)))
        : [],
      usedDonorIds.size > 0
        ? Promise.all(Array.from(usedDonorIds).map(id => ctx.db.get(id)))
        : []
    ]);

    const fundLookup = new Map(funds.filter(Boolean).map(f => [f!._id, f]));
    const categoryLookup = new Map(categories.filter(Boolean).map(c => [c!._id, c]));
    const donorLookup = new Map(donors.filter(Boolean).map(d => [d!._id, d]));

    return transactions.map(transaction => ({
      transaction,
      fund: fundLookup.get(transaction.fundId) ?? null,
      category: transaction.categoryId ? categoryLookup.get(transaction.categoryId) ?? null : null,
      donor: transaction.donorId ? donorLookup.get(transaction.donorId) ?? null : null,
    }));
  },
});

// Multi-period summary for overview cards
export const getMultiPeriodSummary = query({
  args: {
    churchId: v.id("churches"),
    periods: v.array(v.object({
      year: v.number(),
      month: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Parallel queries for all periods
    const results = await Promise.all(
      args.periods.map(async (period) => {
        const transactions = await ctx.db
          .query("transactions")
          .withIndex("by_period", (q) =>
            q.eq("churchId", args.churchId)
             .eq("periodYear", period.year)
             .eq("periodMonth", period.month)
          )
          .collect();

        const summary = transactions.reduce(
          (acc, tx) => {
            acc.count += 1;
            acc.income += tx.type === "income" ? tx.amount : 0;
            acc.expense += tx.type === "expense" ? tx.amount : 0;
            acc.unreconciled += tx.reconciled ? 0 : 1;
            acc.uncategorized += tx.categoryId ? 0 : 1;
            return acc;
          },
          {
            income: 0,
            expense: 0,
            count: 0,
            unreconciled: 0,
            uncategorized: 0,
            year: period.year,
            month: period.month
          }
        );

        return summary;
      })
    );

    return results;
  },
});

// Period trends for sparkline charts
export const getPeriodTrends = query({
  args: {
    churchId: v.id("churches"),
    periods: v.array(v.object({
      year: v.number(),
      month: v.number(),
    })),
  },
  returns: v.array(v.object({
    year: v.number(),
    month: v.number(),
    income: v.number(),
    expense: v.number(),
    net: v.number(),
  })),
  handler: async (ctx, args) => {
    const summaries = await Promise.all(
      args.periods.map(async (period) => {
        const transactions = await ctx.db
          .query("transactions")
          .withIndex("by_period", (q) =>
            q.eq("churchId", args.churchId)
             .eq("periodYear", period.year)
             .eq("periodMonth", period.month)
          )
          .collect();

        const totals = transactions.reduce(
          (acc, tx) => {
            if (tx.type === "income") acc.income += tx.amount;
            else acc.expense += tx.amount;
            return acc;
          },
          { income: 0, expense: 0 }
        );

        return {
          year: period.year,
          month: period.month,
          income: totals.income,
          expense: totals.expense,
          net: totals.income - totals.expense,
        };
      })
    );

    return summaries;
  },
});

// Get recent transactions for dashboard
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("transactions"),
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
    reconciled: v.boolean(),
    churchId: v.id("churches"),
    source: v.optional(v.union(v.literal("manual"), v.literal("csv"), v.literal("api"))),
    csvBatch: v.optional(v.string()),
    createdBy: v.id("users"),
    enteredByName: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    receiptFilename: v.optional(v.string()),
    pendingStatus: v.optional(v.union(v.literal("none"), v.literal("pending"), v.literal("cleared"))),
    pendingReason: v.optional(v.string()),
    expectedClearDate: v.optional(v.string()),
    clearedAt: v.optional(v.number()),
    periodMonth: v.optional(v.number()),
    periodYear: v.optional(v.number()),
    weekEnding: v.optional(v.string()),
    needsReview: v.optional(v.boolean()),
    reviewedAt: v.optional(v.number()),
    _creationTime: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .order("desc")
      .take(args.limit || 10);
  },
});
