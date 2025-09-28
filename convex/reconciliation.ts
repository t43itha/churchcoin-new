import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const startSession = mutation({
  args: {
    churchId: v.id("churches"),
    month: v.string(),
    bankBalance: v.number(),
    ledgerBalance: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reconciliationSessions", {
      churchId: args.churchId,
      month: args.month,
      startedAt: Date.now(),
      status: "open",
      bankBalance: args.bankBalance,
      ledgerBalance: args.ledgerBalance,
    });
  },
});

export const suggestMatches = query({
  args: {
    sessionId: v.id("reconciliationSessions"),
    importId: v.optional(v.id("csvImports")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const csvRows = args.importId
      ? await ctx.db
          .query("csvRows")
          .withIndex("by_import", (q) => q.eq("importId", args.importId!))
          .collect()
      : [];

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", session.churchId))
      .collect();

    const matches = [] as {
      bankRowId: string;
      transactionId: string;
      confidence: number;
    }[];

    for (const row of csvRows) {
      const candidates = transactions.filter((txn) => txn.date === row.raw.date);
      for (const txn of candidates) {
        const amountDelta = Math.abs(Math.abs(txn.amount) - Math.abs(row.raw.amount));
        const refMatch = row.raw.reference && txn.reference
          ? row.raw.reference.toLowerCase() === txn.reference.toLowerCase()
          : false;

        const confidence = Math.max(0, 1 - amountDelta / Math.max(1, Math.abs(txn.amount)));
        matches.push({
          bankRowId: row._id,
          transactionId: txn._id,
          confidence: refMatch ? Math.min(1, confidence + 0.3) : confidence,
        });
      }
    }

    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 100);
  },
});

export const confirmMatch = mutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    bankRowId: v.id("csvRows"),
    transactionId: v.id("transactions"),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("reconciliationMatches", {
      sessionId: args.sessionId,
      bankRowId: args.bankRowId,
      transactionId: args.transactionId,
      confidence: args.confidence,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.transactionId, {
      reconciled: true,
    });
  },
});

export const closeSession = mutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    adjustments: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      ledgerBalance: args.adjustments,
    });
  },
});

export const listSessions = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reconciliationSessions")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .order("desc")
      .collect();
  },
});
