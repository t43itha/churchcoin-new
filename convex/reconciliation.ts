import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const startSession = mutation({
  args: {
    churchId: v.id("churches"),
    month: v.string(),
    bankBalance: v.number(),
    ledgerBalance: v.number(),
    preparedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reconciliationSessions", {
      churchId: args.churchId,
      month: args.month,
      startedAt: Date.now(),
      status: "in-progress",
      bankBalance: args.bankBalance,
      ledgerBalance: args.ledgerBalance,
      pendingTotal: 0,
      variance: args.bankBalance - args.ledgerBalance,
      adjustments: 0,
      preparedBy: args.preparedBy,
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

type DatabaseCtx = MutationCtx | QueryCtx;

const calculatePendingImpact = async (
  ctx: DatabaseCtx,
  session: Doc<"reconciliationSessions">
) => {
  const pendingRecords = await ctx.db
    .query("pendingTransactions")
    .withIndex("by_church_status", (q) =>
      q.eq("churchId", session.churchId).eq("resolvedAt", undefined)
    )
    .collect();

  if (pendingRecords.length === 0) {
    return { pendingTotal: 0, pending: [] as typeof pendingRecords };
  }

  const transactions = await Promise.all(
    pendingRecords.map((record) => ctx.db.get(record.transactionId))
  );

  let pendingTotal = 0;
  pendingRecords.forEach((record, index) => {
    const transaction = transactions[index];
    if (!transaction) {
      return;
    }

    const sign = transaction.type === "income" ? -1 : 1;
    pendingTotal += sign * transaction.amount;
  });

  return { pendingTotal, pending: pendingRecords, transactions };
};

const calculateUnreconciled = async (
  ctx: DatabaseCtx,
  session: Doc<"reconciliationSessions">
) => {
  const unreconciled = await ctx.db
    .query("transactions")
    .withIndex("by_reconciled", (q) =>
      q.eq("churchId", session.churchId).eq("reconciled", false)
    )
    .collect();

  const totalImpact = unreconciled.reduce((acc, txn) => {
    const sign = txn.type === "income" ? 1 : -1;
    return acc + sign * txn.amount;
  }, 0);

  return { unreconciled, totalImpact };
};

export const closeSession = mutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    adjustments: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const { pendingTotal, pending, transactions } = await calculatePendingImpact(
      ctx,
      session
    );
    const { unreconciled, totalImpact } = await calculateUnreconciled(
      ctx,
      session
    );

    const adjustedLedger = session.ledgerBalance + args.adjustments - pendingTotal;
    const variance = session.bankBalance - adjustedLedger;

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      adjustments: args.adjustments,
      pendingTotal,
      variance,
      ledgerBalance: session.ledgerBalance + args.adjustments,
      closedAt: Date.now(),
      notes: args.notes,
    });

    await ctx.db.insert("reportSnapshots", {
      churchId: session.churchId,
      type: "reconciliation",
      generatedAt: Date.now(),
      params: {
        sessionId: args.sessionId,
        month: session.month,
      },
      payload: {
        session,
        adjustments: args.adjustments,
        bankBalance: session.bankBalance,
        ledgerBalance: session.ledgerBalance,
        pendingTotal,
        variance,
        unreconciledTotal: totalImpact,
        pending,
        pendingTransactions: transactions,
        unreconciled,
        notes: args.notes,
      },
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

export const getVarianceReport = query({
  args: { sessionId: v.id("reconciliationSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const { pendingTotal, pending, transactions } = await calculatePendingImpact(
      ctx,
      session
    );
    const { unreconciled, totalImpact } = await calculateUnreconciled(
      ctx,
      session
    );

    const adjustments = session.adjustments ?? 0;
    const variance =
      session.variance ??
      session.bankBalance - (session.ledgerBalance + adjustments - pendingTotal);

    return {
      session,
      pendingTotal,
      pending,
      pendingTransactions: transactions,
      unreconciledTotal: totalImpact,
      unreconciled,
      variance,
      adjustments,
    };
  },
});

export const updateSessionProgress = mutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("in-progress"),
        v.literal("completed")
      )
    ),
    notes: v.optional(v.string()),
    adjustments: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const updates: Partial<Doc<"reconciliationSessions">> = {};

    if (args.status) {
      updates.status = args.status;
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    if (args.adjustments !== undefined) {
      updates.adjustments = args.adjustments;
      updates.ledgerBalance = session.ledgerBalance + args.adjustments;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.sessionId, updates);
    }

    return await ctx.db.get(args.sessionId);
  },
});

export const getReconciliationReport = query({
  args: { sessionId: v.id("reconciliationSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    const snapshot = await ctx.db
      .query("reportSnapshots")
      .withIndex("by_church_type", (q) =>
        q.eq("churchId", session.churchId).eq("type", "reconciliation")
      )
      .collect();

    const match = snapshot.find((entry) => {
      const params = entry.params as { sessionId?: string } | undefined;
      return params?.sessionId === args.sessionId;
    });

    if (match) {
      return match.payload;
    }

    const { pendingTotal, pending, transactions } = await calculatePendingImpact(
      ctx,
      session
    );
    const { unreconciled, totalImpact } = await calculateUnreconciled(ctx, session);
    const adjustments = session.adjustments ?? 0;
    const variance =
      session.variance ??
      session.bankBalance - (session.ledgerBalance + adjustments - pendingTotal);

    return {
      session,
      pendingTotal,
      pending,
      pendingTransactions: transactions,
      unreconciled,
      unreconciledTotal: totalImpact,
      variance,
      adjustments,
      notes: session.notes,
    };
  },
});
