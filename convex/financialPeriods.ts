import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to get month name
function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[month];
}

// Helper to calculate overdue days
function calculateOverdueDays(periodEnd: string): number {
  const endDate = new Date(periodEnd);
  const today = new Date();
  const diffTime = today.getTime() - endDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Get current working period (month-in-arrears)
export const getCurrentPeriod = query({
  args: { churchId: v.id("churches") },
  returns: v.union(v.object({
    _id: v.id("financialPeriods"),
    _creationTime: v.number(),
    churchId: v.id("churches"),
    month: v.number(),
    year: v.number(),
    periodName: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("overdue")
    ),
    periodStart: v.string(),
    periodEnd: v.string(),
    bankTransactionCount: v.number(),
    cashRecordsCount: v.number(),
    categorizedCount: v.number(),
    reviewedCount: v.number(),
    needsReviewCount: v.number(),
    bankUploadedAt: v.optional(v.number()),
    cashEnteredAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    overdueDays: v.optional(v.number()),
  }), v.null()),
  handler: async (ctx, args) => {
    const now = new Date();
    // Month-in-arrears: In October (month 10), we work on September (month 9)
    const month = now.getMonth(); // 0-11, so current month - 1 in effect
    const year = month === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const actualMonth = month === 0 ? 12 : month;

    const period = await ctx.db
      .query("financialPeriods")
      .withIndex("by_church_period", (q) =>
        q.eq("churchId", args.churchId).eq("year", year).eq("month", actualMonth)
      )
      .first();

    if (!period) return null;

    // Check if overdue (calculation only, status update handled by mutation/cron)
    let overdueDays: number | undefined;
    let effectiveStatus = period.status;

    if (period.status !== "completed") {
      overdueDays = calculateOverdueDays(period.periodEnd);
      // Mark as overdue in the response if needed (actual DB update should be done by mutation)
      if (overdueDays > 10) {
        effectiveStatus = "overdue";
      }
    }

    return {
      ...period,
      status: effectiveStatus,
      overdueDays: overdueDays && overdueDays > 0 ? overdueDays : undefined,
    };
  },
});

// List all periods for a church
export const listPeriods = query({
  args: { churchId: v.id("churches") },
  returns: v.array(v.object({
    _id: v.id("financialPeriods"),
    _creationTime: v.number(),
    churchId: v.id("churches"),
    month: v.number(),
    year: v.number(),
    periodName: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("overdue")
    ),
    periodStart: v.string(),
    periodEnd: v.string(),
    bankTransactionCount: v.number(),
    cashRecordsCount: v.number(),
    categorizedCount: v.number(),
    reviewedCount: v.number(),
    needsReviewCount: v.number(),
    bankUploadedAt: v.optional(v.number()),
    cashEnteredAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("financialPeriods")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .order("desc")
      .take(24); // Last 2 years
  },
});

// Create or get period
export const createOrGetPeriod = mutation({
  args: {
    churchId: v.id("churches"),
    month: v.number(),
    year: v.number(),
  },
  returns: v.id("financialPeriods"),
  handler: async (ctx, args) => {
    // Check if exists
    const existing = await ctx.db
      .query("financialPeriods")
      .withIndex("by_church_period", (q) =>
        q.eq("churchId", args.churchId).eq("year", args.year).eq("month", args.month)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new period
    const periodName = `${getMonthName(args.month - 1)} ${args.year}`;

    // Calculate period start and end dates
    const periodStart = new Date(args.year, args.month - 1, 1);
    const periodEnd = new Date(args.year, args.month, 0); // Last day of month

    return await ctx.db.insert("financialPeriods", {
      churchId: args.churchId,
      month: args.month,
      year: args.year,
      periodName,
      status: "draft",
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      bankTransactionCount: 0,
      cashRecordsCount: 0,
      categorizedCount: 0,
      reviewedCount: 0,
      needsReviewCount: 0,
    });
  },
});

// Get period metrics
export const getPeriodMetrics = query({
  args: { periodId: v.id("financialPeriods") },
  returns: v.object({
    total: v.number(),
    categorized: v.number(),
    needsReview: v.number(),
    percentComplete: v.number(),
  }),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) {
      throw new Error("Period not found");
    }

    // Get all transactions for this period
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_period", (q) =>
        q
          .eq("churchId", period.churchId)
          .eq("periodYear", period.year)
          .eq("periodMonth", period.month)
      )
      .collect();

    const categorized = transactions.filter((t) => t.categoryId).length;
    const needsReview = transactions.filter((t) => t.needsReview).length;
    const percentComplete = transactions.length > 0
      ? Math.round((categorized / transactions.length) * 100)
      : 0;

    return {
      total: transactions.length,
      categorized,
      needsReview,
      percentComplete,
    };
  },
});

// Update period status
export const updatePeriodStatus = mutation({
  args: {
    periodId: v.id("financialPeriods"),
    status: v.union(
      v.literal("draft"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("overdue")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: {
      status: "draft" | "processing" | "completed" | "overdue";
      completedAt?: number;
    } = {
      status: args.status,
    };

    if (args.status === "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.periodId, updates);
    return null;
  },
});

// Get period by ID
export const getPeriod = query({
  args: { periodId: v.id("financialPeriods") },
  returns: v.union(v.object({
    _id: v.id("financialPeriods"),
    _creationTime: v.number(),
    churchId: v.id("churches"),
    month: v.number(),
    year: v.number(),
    periodName: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("overdue")
    ),
    periodStart: v.string(),
    periodEnd: v.string(),
    bankTransactionCount: v.number(),
    cashRecordsCount: v.number(),
    categorizedCount: v.number(),
    reviewedCount: v.number(),
    needsReviewCount: v.number(),
    bankUploadedAt: v.optional(v.number()),
    cashEnteredAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.periodId);
  },
});

// Update period metrics after transaction approval
// Returns whether the status changed to "completed"
export const updatePeriodMetrics = mutation({
  args: { periodId: v.id("financialPeriods") },
  returns: v.object({
    statusChanged: v.boolean(),
    newStatus: v.union(
      v.literal("draft"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("overdue")
    ),
    needsReviewCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) {
      throw new Error("Period not found");
    }

    // Get all transactions for this period
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_period", (q) =>
        q
          .eq("churchId", period.churchId)
          .eq("periodYear", period.year)
          .eq("periodMonth", period.month)
      )
      .collect();

    // Calculate metrics
    const total = transactions.length;
    const categorized = transactions.filter((t) => t.categoryId).length;
    const needsReview = transactions.filter(
      (t) => !t.categoryId || t.needsReview
    ).length;

    // Determine new status
    const oldStatus = period.status;
    let newStatus = period.status;

    if (needsReview === 0 && total > 0) {
      // All transactions categorized and reviewed
      newStatus = "completed";
    } else if (needsReview > 0) {
      // Still has pending transactions
      if (oldStatus === "completed") {
        newStatus = "processing"; // Regressed from completed
      } else if (oldStatus === "draft") {
        newStatus = "processing"; // Started processing
      }
    }

    // Update the period
    const updates: {
      categorizedCount: number;
      needsReviewCount: number;
      reviewedCount: number;
      status: "draft" | "processing" | "completed" | "overdue";
      completedAt?: number;
    } = {
      categorizedCount: categorized,
      needsReviewCount: needsReview,
      reviewedCount: categorized, // Assume categorized = reviewed for now
      status: newStatus,
    };

    // Set completedAt timestamp when transitioning to completed
    if (newStatus === "completed" && oldStatus !== "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.periodId, updates);

    return {
      statusChanged: oldStatus !== newStatus && newStatus === "completed",
      newStatus,
      needsReviewCount: needsReview,
    };
  },
});
