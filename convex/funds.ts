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

    const donationsByFund = new Map<
      Doc<"funds">["_id"],
      Map<Id<"donors">, { total: number; lastDate: string }>
    >();

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

      const delta =
        transaction.type === "income"
          ? transaction.amount
          : -transaction.amount;
      summary.transactions.push({ transaction, delta });
      summary.deltaSum += delta;

      if (transaction.type === "income") {
        summary.incomeTotal += transaction.amount;
      } else {
        summary.expenseTotal += transaction.amount;
      }

      if (transaction.type === "income" && transaction.donorId) {
        let donorsForFund = donationsByFund.get(transaction.fundId);
        if (!donorsForFund) {
          donorsForFund = new Map();
          donationsByFund.set(transaction.fundId, donorsForFund);
        }

        const existing =
          donorsForFund.get(transaction.donorId) ?? {
            total: 0,
            lastDate: transaction.date,
          };
        const updatedTotal = existing.total + transaction.amount;
        const updatedLastDate =
          existing.lastDate > transaction.date
            ? existing.lastDate
            : transaction.date;

        donorsForFund.set(transaction.donorId, {
          total: updatedTotal,
          lastDate: updatedLastDate,
        });
      }

      summary.lastTransactionDate = transaction.date;
    }

    const pledges = await ctx.db
      .query("fundPledges")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const pledgesByFund = new Map<
      Doc<"funds">["_id"],
      Doc<"fundPledges">[]
    >();
    for (const pledge of pledges) {
      const existing = pledgesByFund.get(pledge.fundId);
      if (existing) {
        existing.push(pledge);
      } else {
        pledgesByFund.set(pledge.fundId, [pledge]);
      }
    }

    const donorIds = new Set<Id<"donors">>();
    for (const pledge of pledges) {
      donorIds.add(pledge.donorId);
    }
    for (const donorMap of donationsByFund.values()) {
      for (const donorId of donorMap.keys()) {
        donorIds.add(donorId);
      }
    }

    const donorsById = new Map<Id<"donors">, Doc<"donors">>();
    await Promise.all(
      Array.from(donorIds).map(async (donorId) => {
        const donor = await ctx.db.get(donorId);
        if (donor) {
          donorsById.set(donorId, donor);
        }
      })
    );

    return Array.from(summaries.values()).map((summary) => {
      let running = summary.fund.balance - summary.deltaSum;
      const runningBalance = summary.transactions.map(
        ({ transaction, delta }) => {
          running += delta;
          return {
            transactionId: transaction._id,
            date: transaction.date,
            description: transaction.description,
            type: transaction.type,
            amount: transaction.amount,
            balance: running,
          };
        }
      );

      const fundPledges = pledgesByFund.get(summary.fund._id) ?? [];
      const fundDonations =
        donationsByFund.get(summary.fund._id) ??
        new Map<Id<"donors">, { total: number; lastDate: string }>();
      const pledgedDonorIds = new Set<Id<"donors">>(
        fundPledges.map((pledge) => pledge.donorId)
      );

      const pledgeSupporters = fundPledges.map((pledge) => {
        let donatedAmount = 0;
        let lastDonationAfterPledge: string | null = null;

        // Convert pledge date to comparable format (YYYY-MM-DD)
        const pledgeDate = pledge.pledgedAt; // Already in YYYY-MM-DD format

        for (const entry of summary.transactions) {
          const transaction = entry.transaction;
          
          // Convert transaction date from DD/MM/YYYY to YYYY-MM-DD for comparison
          let transactionDateISO = transaction.date;
          if (transaction.date.includes('/')) {
            const [day, month, year] = transaction.date.split('/');
            transactionDateISO = `${year}-${month}-${day}`;
          }

          if (
            transaction.type === "income" &&
            transaction.donorId &&
            transaction.donorId === pledge.donorId &&
            transactionDateISO >= pledgeDate
          ) {
            donatedAmount += transaction.amount;
            if (
              !lastDonationAfterPledge ||
              transaction.date > lastDonationAfterPledge // Keep original format for display
            ) {
              lastDonationAfterPledge = transaction.date;
            }
          }
        }

        const donor = donorsById.get(pledge.donorId);
        const computedStatus: "open" | "fulfilled" | "cancelled" =
          pledge.status === "cancelled"
            ? "cancelled"
            : donatedAmount >= pledge.amount
            ? "fulfilled"
            : pledge.status;

        const baseStats = fundDonations.get(pledge.donorId);

        return {
          pledgeId: pledge._id,
          donorId: pledge.donorId,
          donorName: donor?.name ?? "Unknown donor",
          amountPledged: pledge.amount,
          amountDonated: donatedAmount,
          outstandingAmount: Math.max(pledge.amount - donatedAmount, 0),
          pledgedAt: pledge.pledgedAt,
          dueDate: pledge.dueDate ?? null,
          status: pledge.status,
          computedStatus,
          completion:
            pledge.amount > 0
              ? Math.min(donatedAmount / pledge.amount, 1)
              : 0,
          notes: pledge.notes ?? null,
          lastDonationDate:
            lastDonationAfterPledge ?? baseStats?.lastDate ?? null,
        };
      });

      const donorsWithoutPledge: {
        donorId: Id<"donors">;
        donorName: string;
        total: number;
        lastDonationDate: string | null;
      }[] = [];

      for (const [donorId, stats] of fundDonations.entries()) {
        if (pledgedDonorIds.has(donorId)) {
          continue;
        }

        donorsWithoutPledge.push({
          donorId,
          donorName: donorsById.get(donorId)?.name ?? "Unknown donor",
          total: stats.total,
          lastDonationDate: stats.lastDate,
        });
      }

      const pledgedTotal = fundPledges
        .filter((pledge) => pledge.status !== "cancelled")
        .reduce((sum, pledge) => sum + pledge.amount, 0);

      const supporterCount =
        pledgedDonorIds.size + donorsWithoutPledge.length;

      const fundraising = summary.fund.isFundraising
        ? {
            target: summary.fund.fundraisingTarget ?? null,
            pledgedTotal,
            donationTotal: summary.incomeTotal,
            outstandingToTarget:
              summary.fund.fundraisingTarget !== undefined
                ? Math.max(
                    summary.fund.fundraisingTarget - summary.incomeTotal,
                    0
                  )
                : null,
            pledgeCount: fundPledges.length,
            supporterCount,
            supporters: pledgeSupporters,
            donorsWithoutPledge,
          }
        : null;

      return {
        fund: summary.fund,
        incomeTotal: summary.incomeTotal,
        expenseTotal: summary.expenseTotal,
        lastTransactionDate: summary.lastTransactionDate,
        runningBalance,
        fundraising,
      };
    });
  },
});

