import Fuse from "fuse.js";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Import auth utilities
import {
  requireWritePermission,
  requireAdminPermission,
  verifyDonorOwnership,
} from "./lib/auth";

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

      return fuse.search(args.searchTerm).map((result) => result.item);
  },
});

// Create a new donor (secured)
export const createDonor = mutation({
  args: {
    // churchId kept for backward compatibility but verified against auth
    churchId: v.optional(v.id("churches")),
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
    // Authenticate and authorize
    const church = await requireWritePermission(ctx);

    const { churchId: _unused, ...donorData } = args;

    return await ctx.db.insert("donors", {
      ...donorData,
      churchId: church.churchId,
      isActive: true,
    });
  },
});

// Update donor information (secured)
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
    // Authenticate and authorize
    await requireWritePermission(ctx);

    const { donorId, ...updates } = args;

    // Verify donor belongs to user's church
    await verifyDonorOwnership(ctx, donorId);

    await ctx.db.patch(donorId, updates);
  },
});

// Archive donor (secured - requires admin permission)
export const archiveDonor = mutation({
  args: { donorId: v.id("donors") },
  handler: async (ctx, args) => {
    // Authenticate and authorize (admin required for archive)
    await requireAdminPermission(ctx);

    // Verify donor belongs to user's church
    await verifyDonorOwnership(ctx, args.donorId);

    await ctx.db.patch(args.donorId, {
      isActive: false,
    });
  },
});

// Create anonymous donor (secured)
export const createAnonymousDonor = mutation({
  args: {
    // churchId kept for backward compatibility
    churchId: v.optional(v.id("churches")),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authenticate and authorize
    const church = await requireWritePermission(ctx);

    return await ctx.db.insert("donors", {
      churchId: church.churchId,
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

// Bulk create donors from CSV import
export const bulkCreateDonors = mutation({
  args: {
    churchId: v.id("churches"),
    donors: v.array(
      v.object({
        name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        bankReference: v.optional(v.string()),
        giftAidDeclaration: v.optional(
          v.object({
            signed: v.boolean(),
            date: v.string(),
          })
        ),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const created: Id<"donors">[] = [];
    const skipped: { name: string; reason: string }[] = [];

    for (const donor of args.donors) {
      // Check for duplicates by email or bank reference
      let existingDonor = null;

      if (donor.email) {
        existingDonor = await ctx.db
          .query("donors")
          .withIndex("by_email", (q) =>
            q.eq("churchId", args.churchId).eq("email", donor.email)
          )
          .first();
      }

      if (!existingDonor && donor.bankReference) {
        existingDonor = await ctx.db
          .query("donors")
          .withIndex("by_reference", (q) =>
            q.eq("churchId", args.churchId).eq("bankReference", donor.bankReference)
          )
          .first();
      }

      if (existingDonor) {
        skipped.push({
          name: donor.name,
          reason: "Duplicate email or bank reference",
        });
        continue;
      }

      const donorId = await ctx.db.insert("donors", {
        churchId: args.churchId,
        name: donor.name,
        email: donor.email,
        phone: donor.phone,
        address: donor.address,
        bankReference: donor.bankReference,
        giftAidDeclaration: donor.giftAidDeclaration,
        notes: donor.notes,
        isActive: true,
      });

      created.push(donorId);
    }

    return {
      created,
      skipped,
      summary: `Created ${created.length} donor${created.length === 1 ? "" : "s"}, skipped ${skipped.length} duplicate${skipped.length === 1 ? "" : "s"}`,
    };
  },
});
