import Fuse from "fuse.js";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all donors for a church
export const getDonors = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get donor by ID
export const getDonor = query({
  args: { donorId: v.id("donors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.donorId);
  },
});

// Search donors by name or email
export const searchDonors = query({
  args: {
    churchId: v.id("churches"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const donors = await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const fuse = new Fuse(donors, {
      keys: ["name", "email", "bankReference"],
      threshold: 0.4,
    });

    if (!args.searchTerm) {
      return donors;
    }

    return fuse.search(args.searchTerm).map((result: any) => result.item);
  },
});

// Create a new donor
export const createDonor = mutation({
  args: {
    churchId: v.id("churches"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    bankReference: v.optional(v.string()),
    notes: v.optional(v.string()),
    giftAidDeclaration: v.optional(v.object({
      signed: v.boolean(),
      date: v.string(),
      expiryDate: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("donors", {
      ...args,
      isActive: true,
    });
  },
});

// Update donor information
export const updateDonor = mutation({
  args: {
    donorId: v.id("donors"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    bankReference: v.optional(v.string()),
    notes: v.optional(v.string()),
    giftAidDeclaration: v.optional(v.object({
      signed: v.boolean(),
      date: v.string(),
      expiryDate: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { donorId, ...updates } = args;
    await ctx.db.patch(donorId, updates);
  },
});

// Archive donor (soft delete)
export const archiveDonor = mutation({
  args: { donorId: v.id("donors") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.donorId, {
      isActive: false,
    });
  },
});

export const createAnonymousDonor = mutation({
  args: { churchId: v.id("churches"), label: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("donors", {
      churchId: args.churchId,
      name: args.label ?? "Anonymous donor",
      isActive: true,
      notes: "System-generated anonymous donor",
    });
  },
});

// Get donor giving history
export const getDonorGivingHistory = query({
  args: {
    donorId: v.id("donors"),
    year: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let transactions = await ctx.db
      .query("transactions")
      .withIndex("by_donor", (q) => q.eq("donorId", args.donorId))
      .filter((q) => q.eq(q.field("type"), "income"))
      .order("desc")
      .collect();

    // Filter by year if specified
    const { year } = args;
    if (year) {
      transactions = transactions.filter((t) => t.date.startsWith(year));
    }

    // Calculate totals
    const totalGiving = transactions.reduce((sum, t) => sum + t.amount, 0);
    const giftAidEligible = transactions
      .filter((t) => t.giftAid)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      transactions,
      totals: {
        totalGiving,
        giftAidEligible,
        transactionCount: transactions.length,
      },
    };
  },
});

export const getDonorGivingByFund = query({
  args: {
    donorId: v.id("donors"),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_donor", (q) => q.eq("donorId", args.donorId))
      .collect();

    const donor = await ctx.db.get(args.donorId);
    if (!donor) {
      throw new Error("Donor not found");
    }

    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", donor.churchId!))
      .collect();

    const fundLookup = new Map(funds.map((fund) => [fund._id, fund.name]));

    const aggregates = new Map<string, { amount: number; count: number }>();
    for (const txn of transactions) {
      const key = fundLookup.get(txn.fundId) ?? "Unknown";
      const aggregate = aggregates.get(key) ?? { amount: 0, count: 0 };
      aggregate.amount += txn.amount;
      aggregate.count += 1;
      aggregates.set(key, aggregate);
    }

    return Array.from(aggregates.entries()).map(([fundName, stats]) => ({
      fundName,
      ...stats,
    }));
  },
});

// Find donors by bank reference (for matching CSV imports)
export const findDonorByBankReference = query({
  args: {
    churchId: v.id("churches"),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("donors")
      .withIndex("by_reference", (q) =>
        q.eq("churchId", args.churchId).eq("bankReference", args.reference)
      )
      .first();
  },
});

export const generateDonorStatement = query({
  args: {
    donorId: v.id("donors"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    const donor = await ctx.db.get(args.donorId);
    if (!donor) {
      throw new Error("Donor not found");
    }

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_donor", (q) => q.eq("donorId", args.donorId))
      .collect();

    const filtered = transactions.filter(
      (txn) => txn.date >= args.fromDate && txn.date <= args.toDate
    );

    const total = filtered.reduce((sum, txn) => sum + txn.amount, 0);

    return {
      donor: {
        name: donor.name,
        email: donor.email,
        address: donor.address,
      },
      transactions: filtered,
      totals: {
        total,
        count: filtered.length,
      },
      period: {
        from: args.fromDate,
        to: args.toDate,
      },
      generatedAt: new Date().toISOString(),
    };
  },
});
