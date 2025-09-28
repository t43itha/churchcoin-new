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