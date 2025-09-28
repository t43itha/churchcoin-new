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

    const searchLower = args.searchTerm.toLowerCase();
    return donors.filter(
      (donor) =>
        donor.name.toLowerCase().includes(searchLower) ||
        (donor.email && donor.email.toLowerCase().includes(searchLower)) ||
        (donor.bankReference && donor.bankReference.toLowerCase().includes(searchLower))
    );
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
    if (args.year) {
      transactions = transactions.filter((t) => t.date.startsWith(args.year));
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