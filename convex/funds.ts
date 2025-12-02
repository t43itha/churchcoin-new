import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { fundTypeValidator } from "./validators";
import { assertExists } from "./lib/errors";

// Import auth utilities
import {
  requireWritePermission,
  requireAdminPermission,
  getChurchContext,
  verifyFundOwnership,
} from "./lib/auth";

// Import fund overview helpers
import {
  getFundsByChurch,
  initializeFundSummaries,
  processTransactions,
  groupPledgesByFund,
  collectDonorIds,
  loadDonorsById,
  buildFundOverviewResult,
} from "./lib/fundOverview";

// Get all funds for a church (with optional limit for performance)
export const getFunds = query({
  args: {
    churchId: v.id("churches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100; // Sensible default
    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(limit);

    return funds;
  },
});

/**
 * Get funds with pagination support for large datasets.
 * Returns paginated results with continuation cursor.
 */
export const getFundsPaginated = query({
  args: {
    churchId: v.id("churches"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .paginate(args.paginationOpts);
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

// Create a new fund (secured)
export const createFund = mutation({
  args: {
    // churchId kept for backward compatibility but verified against auth
    churchId: v.optional(v.id("churches")),
    name: v.string(),
    type: v.union(
      v.literal("general"),
      v.literal("restricted"),
      v.literal("designated")
    ),
    description: v.optional(v.string()),
    restrictions: v.optional(v.string()),
    isFundraising: v.optional(v.boolean()),
    fundraisingTarget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Authenticate and authorize
    const church = await requireWritePermission(ctx);

    const fundId = await ctx.db.insert("funds", {
      churchId: church.churchId,
      name: args.name,
      type: args.type,
      balance: 0,
      description: args.description,
      restrictions: args.restrictions,
      isFundraising: args.isFundraising ?? false,
      fundraisingTarget:
        args.isFundraising && args.fundraisingTarget !== undefined
          ? args.fundraisingTarget
          : undefined,
      isActive: true,
    });

    return fundId;
  },
});

// Update a fund (secured)
export const updateFund = mutation({
  args: {
    fundId: v.id("funds"),
    name: v.optional(v.string()),
    type: v.optional(fundTypeValidator),
    description: v.optional(v.union(v.string(), v.null())),
    restrictions: v.optional(v.union(v.string(), v.null())),
    isFundraising: v.optional(v.boolean()),
    fundraisingTarget: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    // Authenticate and authorize
    await requireWritePermission(ctx);

    const { fundId, ...updates } = args;

    // Verify fund belongs to user's church
    const fund = await verifyFundOwnership(ctx, fundId);

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

    if (updates.isFundraising !== undefined) {
      patch.isFundraising = updates.isFundraising;
      if (!updates.isFundraising) {
        patch.fundraisingTarget = undefined;
      }
    }

    if (updates.fundraisingTarget !== undefined) {
      patch.fundraisingTarget = updates.fundraisingTarget ?? undefined;
    }

    if (Object.keys(patch).length === 0) {
      return fundId;
    }

    await ctx.db.patch(fundId, patch);

    return fundId;
  },
});

// Update fund balance (secured)
export const updateFundBalance = mutation({
  args: {
    fundId: v.id("funds"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Authenticate and authorize
    await requireWritePermission(ctx);

    // Verify fund belongs to user's church
    const fund = await verifyFundOwnership(ctx, args.fundId);

    const newBalance = fund.balance + args.amount;

    await ctx.db.patch(args.fundId, {
      balance: newBalance,
    });

    return newBalance;
  },
});

// Archive fund (secured - requires admin permission)
export const archiveFund = mutation({
  args: { fundId: v.id("funds") },
  handler: async (ctx, args) => {
    // Authenticate and authorize (admin required for archive/delete)
    await requireAdminPermission(ctx);

    // Verify fund belongs to user's church
    await verifyFundOwnership(ctx, args.fundId);

    await ctx.db.patch(args.fundId, {
      isActive: false,
    });
  },
});

// Simple list for dashboard without church context (for demo)
export const list = query({
  args: { churchId: v.id("churches") },
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
    isFundraising: v.optional(v.boolean()),
    fundraisingTarget: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get total balance across all funds
export const getTotalBalance = query({
  args: { churchId: v.id("churches") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return funds.reduce((total, fund) => total + fund.balance, 0);
  },
});

/**
 * Get comprehensive fund overview with transactions, balances, and fundraising stats.
 * Refactored to use helper functions for maintainability.
 *
 * @see convex/lib/fundOverview.ts for helper implementations
 */
export const getFundsOverview = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    // 1. Get all active funds
    const funds = await getFundsByChurch(ctx, args.churchId);

    // 2. Initialize fund summaries
    const summaries = initializeFundSummaries(funds);

    // 3. Fetch and process transactions
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .order("asc")
      .collect();

    const donationsByFund = processTransactions(transactions, summaries);

    // 4. Fetch and group pledges
    const pledges = await ctx.db
      .query("fundPledges")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const pledgesByFund = groupPledgesByFund(pledges);

    // 5. Load all relevant donors in batch
    const donorIds = collectDonorIds(pledges, donationsByFund);
    const donorsById = await loadDonorsById(ctx, donorIds);

    // 6. Build final results
    return Array.from(summaries.values()).map((summary) =>
      buildFundOverviewResult(summary, pledgesByFund, donationsByFund, donorsById)
    );
  },
});

