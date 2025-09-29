import { mutation } from "./_generated/server";
import { v } from "convex/values";

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
