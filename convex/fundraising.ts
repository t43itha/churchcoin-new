import Fuse from "fuse.js";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const createPledge = mutation({
  args: {
    churchId: v.id("churches"),
    fundId: v.id("funds"),
    donorId: v.id("donors"),
    amount: v.number(),
    pledgedAt: v.string(),
    dueDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new Error("Pledge amount must be greater than zero");
    }

    const fund = await ctx.db.get(args.fundId);
    if (!fund) {
      throw new Error("Fund not found");
    }
    if (fund.churchId !== args.churchId) {
      throw new Error("Fund does not belong to this church");
    }
    if (!fund.isFundraising) {
      throw new Error("Fund is not marked as fundraising");
    }

    const donor = await ctx.db.get(args.donorId);
    if (!donor) {
      throw new Error("Donor not found");
    }
    if (donor.churchId !== args.churchId) {
      throw new Error("Donor does not belong to this church");
    }

    return await ctx.db.insert("fundPledges", {
      churchId: args.churchId,
      fundId: args.fundId,
      donorId: args.donorId,
      amount: args.amount,
      pledgedAt: args.pledgedAt,
      dueDate: args.dueDate,
      notes: args.notes,
      status: "open",
    });
  },
});

export const updatePledge = mutation({
  args: {
    pledgeId: v.id("fundPledges"),
    amount: v.optional(v.number()),
    pledgedAt: v.optional(v.string()),
    dueDate: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
    status: v.optional(
      v.union(v.literal("open"), v.literal("fulfilled"), v.literal("cancelled"))
    ),
  },
  handler: async (ctx, args) => {
    const { pledgeId, ...updates } = args;
    const pledge = await ctx.db.get(pledgeId);
    if (!pledge) {
      throw new Error("Pledge not found");
    }

    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error("Pledge amount must be greater than zero");
    }

    const patch: Partial<typeof pledge> = {};

    if (updates.amount !== undefined) {
      patch.amount = updates.amount;
    }
    if (updates.pledgedAt !== undefined) {
      patch.pledgedAt = updates.pledgedAt;
    }
    if (updates.dueDate !== undefined) {
      patch.dueDate = updates.dueDate ?? undefined;
    }
    if (updates.notes !== undefined) {
      patch.notes = updates.notes ?? undefined;
    }
    if (updates.status !== undefined) {
      patch.status = updates.status;
    }

    if (Object.keys(patch).length === 0) {
      return pledgeId;
    }

    await ctx.db.patch(pledgeId, patch);

    return pledgeId;
  },
});

// Match donor by name or email with fuzzy matching
export const matchDonorByNameOrEmail = query({
  args: {
    churchId: v.id("churches"),
    name: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Try exact email match first (highest confidence)
    if (args.email) {
      const byEmail = await ctx.db
        .query("donors")
        .withIndex("by_email", (q) => 
          q.eq("churchId", args.churchId).eq("email", args.email)
        )
        .first();
      
      if (byEmail) {
        return { donor: byEmail, confidence: "high" as const };
      }
    }

    // 2. Get all donors and use Fuse.js for fuzzy name matching
    const allDonors = await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (allDonors.length === 0) {
      return { donor: null, confidence: null };
    }

    // Fuzzy match logic
    const fuse = new Fuse(allDonors, {
      keys: ["name"],
      threshold: 0.3, // Lower = stricter matching (0.0 = exact, 1.0 = match anything)
    });

    const results = fuse.search(args.name);
    if (results.length > 0) {
      const topMatch = results[0];
      // Fuse.js score: 0 = perfect match, 1 = worst match
      const confidence = 
        topMatch.score === undefined || topMatch.score < 0.1 
          ? "high" 
          : topMatch.score < 0.3 
          ? "medium" 
          : "low";
      return { donor: topMatch.item, confidence };
    }

    return { donor: null, confidence: null };
  },
});

// Bulk create pledges
export const bulkCreatePledges = mutation({
  args: {
    churchId: v.id("churches"),
    fundId: v.id("funds"),
    pledges: v.array(
      v.object({
        donorId: v.id("donors"),
        amount: v.number(),
        pledgedAt: v.string(),
        dueDate: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify fund is fundraising
    const fund = await ctx.db.get(args.fundId);
    if (!fund || !fund.isFundraising) {
      throw new Error("Fund must be marked as fundraising");
    }

    const created: Id<"fundPledges">[] = [];
    const errors: { donorId: Id<"donors">; reason: string }[] = [];

    for (const pledge of args.pledges) {
      try {
        // Check for duplicate pledge (same donor + fund with open/fulfilled status)
        const existing = await ctx.db
          .query("fundPledges")
          .withIndex("by_donor", (q) => q.eq("donorId", pledge.donorId))
          .filter((q) => q.eq(q.field("fundId"), args.fundId))
          .first();

        if (existing && existing.status !== "cancelled") {
          errors.push({ 
            donorId: pledge.donorId, 
            reason: "Donor already has active pledge for this fund" 
          });
          continue;
        }

        // Validate amount
        if (pledge.amount <= 0) {
          errors.push({ 
            donorId: pledge.donorId, 
            reason: "Pledge amount must be greater than zero" 
          });
          continue;
        }

        const pledgeId = await ctx.db.insert("fundPledges", {
          churchId: args.churchId,
          fundId: args.fundId,
          donorId: pledge.donorId,
          amount: pledge.amount,
          pledgedAt: pledge.pledgedAt,
          dueDate: pledge.dueDate,
          notes: pledge.notes,
          status: "open",
        });

        created.push(pledgeId);
      } catch (error) {
        errors.push({ 
          donorId: pledge.donorId, 
          reason: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return {
      created,
      errors,
      summary: `Created ${created.length} pledge${created.length === 1 ? "" : "s"}, ${errors.length} error${errors.length === 1 ? "" : "s"}`,
    };
  },
});
