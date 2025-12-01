import { internalMutation, internalQuery, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import { normalizeRole } from "./roles";

// Import shared utilities
import { calculatePeriodFields } from "./lib/periods";
import { requirePermission, verifyPlaidItemOwnership } from "./lib/auth";

// ============================================================================
// PUBLIC QUERIES (secured with auth middleware)
// ============================================================================

/**
 * Get authenticated user context for Plaid operations.
 * This query uses our auth middleware to securely get the user/church IDs
 * instead of accepting them from the client.
 */
export const getPlaidAuthContext = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Require MANAGE_BANK_CONNECTIONS permission
      const churchContext = await requirePermission(ctx, "MANAGE_BANK_CONNECTIONS");

      return {
        valid: true,
        userId: churchContext.userId,
        churchId: churchContext.churchId,
        churchName: churchContext.church.name,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Authentication failed",
        userId: null,
        churchId: null,
        churchName: null,
      };
    }
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

export const validateUserForPlaid = internalQuery({
  args: {
    churchId: v.id("churches"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) {
      return { valid: false, error: "Church not found" };
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { valid: false, error: "User not found" };
    }

    const normalizedRole = normalizeRole(user.role);
    if (normalizedRole !== "administrator" && normalizedRole !== "finance") {
      return { valid: false, error: "Only administrators and finance users can connect bank accounts" };
    }

    if (user.churchId !== args.churchId) {
      return { valid: false, error: "User does not belong to this church" };
    }

    return { valid: true, churchName: church.name };
  },
});

export const getPlaidItemInternal = internalQuery({
  args: {
    plaidItemId: v.id("plaidItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.plaidItemId);
    if (!item) return null;

    return {
      _id: item._id,
      churchId: item.churchId,
      itemId: item.itemId,
      accessToken: item.accessToken, // Include for internal use
      institutionId: item.institutionId,
      institutionName: item.institutionName,
      accounts: item.accounts,
      status: item.status,
      syncCursor: item.syncCursor,
      lastSyncedAt: item.lastSyncedAt,
      lastSuccessfulSyncAt: item.lastSuccessfulSyncAt,
      errorMessage: item.errorMessage,
    };
  },
});

export const getPlaidItemForDisconnect = internalQuery({
  args: {
    plaidItemId: v.id("plaidItems"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const plaidItem = await ctx.db.get(args.plaidItemId);
    if (!plaidItem) {
      return { valid: false, error: "Plaid item not found" };
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { valid: false, error: "User not found" };
    }

    const normalizedRole = normalizeRole(user.role);
    if (normalizedRole !== "administrator") {
      return { valid: false, error: "Only administrators can disconnect bank accounts" };
    }

    return {
      valid: true,
      accessToken: plaidItem.accessToken,
      churchId: plaidItem.churchId,
      institutionName: plaidItem.institutionName,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

export const savePlaidItem = internalMutation({
  args: {
    churchId: v.id("churches"),
    itemId: v.string(),
    accessToken: v.string(),
    institutionId: v.string(),
    institutionName: v.string(),
    accounts: v.array(
      v.object({
        accountId: v.string(),
        name: v.string(),
        officialName: v.optional(v.string()),
        type: v.string(),
        subtype: v.string(),
        mask: v.optional(v.string()),
        balances: v.object({
          current: v.optional(v.number()),
          available: v.optional(v.number()),
          limit: v.optional(v.number()),
        }),
      })
    ),
    userId: v.id("users"),
  },
  returns: v.id("plaidItems"),
  handler: async (ctx, args) => {
    // Check if item already exists
    const existingItem = await ctx.db
      .query("plaidItems")
      .withIndex("by_item_id", (q) => q.eq("itemId", args.itemId))
      .first();

    if (existingItem) {
      // Update existing item
      await ctx.db.patch(existingItem._id, {
        accessToken: args.accessToken,
        accounts: args.accounts,
        status: "active",
        errorMessage: undefined,
        updatedAt: Date.now(),
      });

      await ctx.db.insert("auditLog", {
        churchId: args.churchId,
        userId: args.userId,
        action: "RECONNECT_BANK_ACCOUNT",
        entityType: "plaidItems",
        entityId: existingItem._id,
        changes: { institutionName: args.institutionName },
        timestamp: Date.now(),
      });

      return existingItem._id;
    }

    // Create new plaid item
    const plaidItemId = await ctx.db.insert("plaidItems", {
      churchId: args.churchId,
      itemId: args.itemId,
      accessToken: args.accessToken,
      institutionId: args.institutionId,
      institutionName: args.institutionName,
      accounts: args.accounts,
      status: "active",
      syncCursor: undefined,
      lastSyncedAt: undefined,
      lastSuccessfulSyncAt: undefined,
      errorMessage: undefined,
      linkedBy: args.userId,
      linkedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("auditLog", {
      churchId: args.churchId,
      userId: args.userId,
      action: "LINK_BANK_ACCOUNT",
      entityType: "plaidItems",
      entityId: plaidItemId,
      changes: {
        institutionName: args.institutionName,
        accountCount: args.accounts.length,
      },
      timestamp: Date.now(),
    });

    return plaidItemId;
  },
});

export const processPlaidTransactions = internalMutation({
  args: {
    plaidItemId: v.id("plaidItems"),
    userId: v.id("users"),
    added: v.array(
      v.object({
        transaction_id: v.string(),
        account_id: v.string(),
        date: v.string(),
        authorized_date: v.optional(v.string()),
        name: v.string(),
        merchant_name: v.optional(v.string()),
        amount: v.number(),
        iso_currency_code: v.optional(v.string()),
        category: v.optional(v.array(v.string())),
        category_id: v.optional(v.string()),
        pending: v.boolean(),
      })
    ),
    modified: v.array(
      v.object({
        transaction_id: v.string(),
        account_id: v.string(),
        date: v.string(),
        name: v.string(),
        merchant_name: v.optional(v.string()),
        amount: v.number(),
        pending: v.boolean(),
      })
    ),
    removed: v.array(v.object({ transaction_id: v.string() })),
    nextCursor: v.string(),
  },
  returns: v.object({
    added: v.number(),
    modified: v.number(),
    removed: v.number(),
  }),
  handler: async (ctx, args) => {
    const startTime = Date.now();

    const plaidItem = await ctx.db.get(args.plaidItemId);
    if (!plaidItem) {
      throw new ConvexError("Plaid item not found");
    }

    const church = await ctx.db.get(plaidItem.churchId);
    if (!church) {
      throw new ConvexError("Church not found");
    }

    const defaultFundId =
      church.settings.plaidDefaultFundId || church.settings.defaultFundId;
    if (!defaultFundId) {
      throw new ConvexError(
        "No default fund configured. Please set a default fund for bank imports in Settings."
      );
    }

    const fund = await ctx.db.get(defaultFundId);
    if (!fund) {
      throw new ConvexError("Default fund not found");
    }

    let addedCount = 0;
    let modifiedCount = 0;
    let removedCount = 0;
    let currentFundBalance = fund.balance;

    // Process ADDED transactions
    for (const plaidTx of args.added) {
      const existingTx = await ctx.db
        .query("transactions")
        .withIndex("by_plaid_transaction", (q) =>
          q.eq("plaidTransactionId", plaidTx.transaction_id)
        )
        .first();

      if (existingTx) {
        continue;
      }

      const amount = Math.abs(plaidTx.amount);
      const type: "income" | "expense" = plaidTx.amount < 0 ? "income" : "expense";
      const description = plaidTx.merchant_name || plaidTx.name || "Bank transaction";
      const periodFields = calculatePeriodFields(plaidTx.date);

      await ctx.runMutation(api.financialPeriods.createOrGetPeriod, {
        churchId: plaidItem.churchId,
        month: periodFields.periodMonth,
        year: periodFields.periodYear,
      });

      await ctx.db.insert("transactions", {
        churchId: plaidItem.churchId,
        date: plaidTx.date,
        description,
        amount,
        type,
        fundId: defaultFundId,
        categoryId: undefined,
        donorId: undefined,
        method: "bank_transfer",
        reference: plaidTx.transaction_id,
        giftAid: false,
        reconciled: !plaidTx.pending,
        notes: `Imported from ${plaidItem.institutionName}`,
        createdBy: args.userId,
        source: "plaid",
        plaidTransactionId: plaidTx.transaction_id,
        plaidItemId: args.plaidItemId,
        plaidAccountId: plaidTx.account_id,
        plaidPending: plaidTx.pending,
        plaidMerchantName: plaidTx.merchant_name,
        periodMonth: periodFields.periodMonth,
        periodYear: periodFields.periodYear,
        weekEnding: periodFields.weekEnding,
      });

      const balanceChange = type === "income" ? amount : -amount;
      currentFundBalance += balanceChange;

      addedCount++;
    }

    // Update fund balance after all additions
    if (addedCount > 0) {
      await ctx.db.patch(defaultFundId, {
        balance: currentFundBalance,
      });
    }

    // Process MODIFIED transactions
    for (const plaidTx of args.modified) {
      const existingTx = await ctx.db
        .query("transactions")
        .withIndex("by_plaid_transaction", (q) =>
          q.eq("plaidTransactionId", plaidTx.transaction_id)
        )
        .first();

      if (existingTx) {
        // Calculate new amount and type from Plaid data
        const newAmount = Math.abs(plaidTx.amount);
        const newType: "income" | "expense" = plaidTx.amount < 0 ? "income" : "expense";
        const newPeriodFields = calculatePeriodFields(plaidTx.date);

        // Calculate balance adjustment: reverse old impact, apply new impact
        const oldBalanceImpact = existingTx.type === "income" ? existingTx.amount : -existingTx.amount;
        const newBalanceImpact = newType === "income" ? newAmount : -newAmount;
        const balanceDelta = newBalanceImpact - oldBalanceImpact;

        // Update the transaction with all changed fields
        await ctx.db.patch(existingTx._id, {
          description: plaidTx.merchant_name || plaidTx.name || existingTx.description,
          amount: newAmount,
          type: newType,
          date: plaidTx.date,
          periodMonth: newPeriodFields.periodMonth,
          periodYear: newPeriodFields.periodYear,
          weekEnding: newPeriodFields.weekEnding,
          reconciled: !plaidTx.pending,
          plaidPending: plaidTx.pending,
          plaidMerchantName: plaidTx.merchant_name,
        });

        // Adjust fund balance if amount or type changed
        if (balanceDelta !== 0) {
          const txFund = await ctx.db.get(existingTx.fundId);
          if (txFund) {
            await ctx.db.patch(existingTx.fundId, {
              balance: txFund.balance + balanceDelta,
            });
          }
        }

        modifiedCount++;
      }
    }

    // Process REMOVED transactions
    for (const removedTx of args.removed) {
      const existingTx = await ctx.db
        .query("transactions")
        .withIndex("by_plaid_transaction", (q) =>
          q.eq("plaidTransactionId", removedTx.transaction_id)
        )
        .first();

      if (existingTx) {
        const balanceChange =
          existingTx.type === "income" ? -existingTx.amount : existingTx.amount;
        const currentFund = await ctx.db.get(existingTx.fundId);
        if (currentFund) {
          await ctx.db.patch(existingTx.fundId, {
            balance: currentFund.balance + balanceChange,
          });
        }

        await ctx.db.delete(existingTx._id);

        removedCount++;
      }
    }

    // Update plaid item
    await ctx.db.patch(args.plaidItemId, {
      syncCursor: args.nextCursor,
      lastSyncedAt: Date.now(),
      lastSuccessfulSyncAt: Date.now(),
      status: "active",
      errorMessage: undefined,
      updatedAt: Date.now(),
    });

    // Log sync result
    await ctx.db.insert("plaidSyncLogs", {
      churchId: plaidItem.churchId,
      plaidItemId: args.plaidItemId,
      syncedAt: Date.now(),
      status: "success",
      transactionsAdded: addedCount,
      transactionsModified: modifiedCount,
      transactionsRemoved: removedCount,
      syncDurationMs: Date.now() - startTime,
    });

    return {
      added: addedCount,
      modified: modifiedCount,
      removed: removedCount,
    };
  },
});

export const updatePlaidItemError = internalMutation({
  args: {
    plaidItemId: v.id("plaidItems"),
    errorMessage: v.string(),
    status: v.union(v.literal("error"), v.literal("login_required")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plaidItem = await ctx.db.get(args.plaidItemId);
    if (!plaidItem) return null;

    await ctx.db.patch(args.plaidItemId, {
      status: args.status,
      errorMessage: args.errorMessage,
      lastSyncedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("plaidSyncLogs", {
      churchId: plaidItem.churchId,
      plaidItemId: args.plaidItemId,
      syncedAt: Date.now(),
      status: "failed",
      transactionsAdded: 0,
      transactionsModified: 0,
      transactionsRemoved: 0,
      errorMessage: args.errorMessage,
      syncDurationMs: 0,
    });

    return null;
  },
});

export const markPlaidItemDisconnected = internalMutation({
  args: {
    plaidItemId: v.id("plaidItems"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plaidItem = await ctx.db.get(args.plaidItemId);
    if (!plaidItem) return null;

    await ctx.db.patch(args.plaidItemId, {
      status: "disconnected",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("auditLog", {
      churchId: plaidItem.churchId,
      userId: args.userId,
      action: "DISCONNECT_BANK_ACCOUNT",
      entityType: "plaidItems",
      entityId: args.plaidItemId,
      changes: { institutionName: plaidItem.institutionName },
      timestamp: Date.now(),
    });

    return null;
  },
});

export const updatePlaidItemAccounts = internalMutation({
  args: {
    plaidItemId: v.id("plaidItems"),
    accounts: v.array(
      v.object({
        accountId: v.string(),
        name: v.string(),
        officialName: v.optional(v.string()),
        type: v.string(),
        subtype: v.string(),
        mask: v.optional(v.string()),
        balances: v.object({
          current: v.optional(v.number()),
          available: v.optional(v.number()),
          limit: v.optional(v.number()),
        }),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.plaidItemId, {
      accounts: args.accounts,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================================================
// PUBLIC QUERIES (for frontend)
// ============================================================================

export const listPlaidItems = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("plaidItems")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    // SECURITY: Never return accessToken to frontend
    return items.map((item) => ({
      _id: item._id,
      churchId: item.churchId,
      itemId: item.itemId,
      institutionId: item.institutionId,
      institutionName: item.institutionName,
      accounts: item.accounts,
      status: item.status,
      lastSyncedAt: item.lastSyncedAt,
      lastSuccessfulSyncAt: item.lastSuccessfulSyncAt,
      errorMessage: item.errorMessage,
      linkedBy: item.linkedBy,
      linkedAt: item.linkedAt,
      updatedAt: item.updatedAt,
    }));
  },
});

export const getPlaidItem = query({
  args: { plaidItemId: v.id("plaidItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.plaidItemId);
    if (!item) return null;

    return {
      _id: item._id,
      churchId: item.churchId,
      itemId: item.itemId,
      institutionId: item.institutionId,
      institutionName: item.institutionName,
      accounts: item.accounts,
      status: item.status,
      lastSyncedAt: item.lastSyncedAt,
      lastSuccessfulSyncAt: item.lastSuccessfulSyncAt,
      errorMessage: item.errorMessage,
      linkedBy: item.linkedBy,
      linkedAt: item.linkedAt,
      updatedAt: item.updatedAt,
    };
  },
});

export const getSyncHistory = query({
  args: {
    plaidItemId: v.id("plaidItems"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plaidSyncLogs")
      .withIndex("by_item", (q) => q.eq("plaidItemId", args.plaidItemId))
      .order("desc")
      .take(args.limit || 20);
  },
});

export const getPlaidTransactions = query({
  args: {
    churchId: v.id("churches"),
    plaidItemId: v.optional(v.id("plaidItems")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let transactions;

    if (args.plaidItemId) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_plaid_item", (q) => q.eq("plaidItemId", args.plaidItemId))
        .order("desc")
        .take(args.limit || 50);
    } else {
      const allTransactions = await ctx.db
        .query("transactions")
        .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
        .order("desc")
        .collect();

      transactions = allTransactions
        .filter((t) => t.source === "plaid")
        .slice(0, args.limit || 50);
    }

    return transactions;
  },
});
