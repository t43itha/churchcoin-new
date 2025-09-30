import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listActiveInsights = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const insights = await ctx.db
      .query("aiInsights")
      .withIndex("by_church_active", (q) =>
        q.eq("churchId", args.churchId).eq("isDismissed", false)
      )
      .order("desc")
      .take(10);

    const now = Date.now();
    return insights.filter(
      (insight) => !insight.expiresAt || insight.expiresAt > now
    );
  },
});

export const dismissInsight = mutation({
  args: { insightId: v.id("aiInsights") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.insightId, { isDismissed: true });
  },
});

export const markInsightRead = mutation({
  args: { insightId: v.id("aiInsights") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.insightId, { isRead: true });
  },
});

export const generateInsights = mutation({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) => q.eq("churchId", args.churchId))
      .order("desc")
      .take(100);

    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const donors = await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const insights: Array<{
      type: "anomaly" | "trend" | "compliance" | "prediction" | "recommendation";
      title: string;
      description: string;
      severity: "info" | "warning" | "critical";
      actionable: boolean;
      actionUrl?: string;
    }> = [];

    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentTransactions = transactions.filter(
      (t) => new Date(t.date).getTime() > oneMonthAgo
    );

    if (recentTransactions.length === 0) {
      insights.push({
        type: "recommendation",
        title: "No recent transactions",
        description:
          "You haven't recorded any transactions in the past 30 days. Regular updates help maintain accurate financial records.",
        severity: "warning",
        actionable: true,
        actionUrl: "/transactions",
      });
    }

    const lowBalanceFunds = funds.filter((f) => f.balance < 500 && f.isActive);
    if (lowBalanceFunds.length > 0) {
      insights.push({
        type: "prediction",
        title: `${lowBalanceFunds.length} fund(s) running low`,
        description: `${lowBalanceFunds.map((f) => f.name).join(", ")} have balances below £500. Consider reviewing income sources or reallocating funds.`,
        severity: "warning",
        actionable: true,
        actionUrl: "/funds",
      });
    }

    const donorsWithoutDeclaration = donors.filter(
      (d) => d.isActive && !d.giftAidDeclaration?.signed
    );
    if (donorsWithoutDeclaration.length > 5) {
      insights.push({
        type: "compliance",
        title: "Missing Gift Aid declarations",
        description: `${donorsWithoutDeclaration.length} active donors don't have Gift Aid declarations. This could affect your Gift Aid claims.`,
        severity: "warning",
        actionable: true,
        actionUrl: "/donors",
      });
    }

    const expenseTransactions = recentTransactions.filter(
      (t) => t.type === "expense"
    );
    const largeExpenses = expenseTransactions.filter((t) => t.amount > 1000);
    if (largeExpenses.length > 0) {
      insights.push({
        type: "anomaly",
        title: `${largeExpenses.length} large expense(s) detected`,
        description: `You have ${largeExpenses.length} expenses over £1,000 in the past month. Review these for accuracy.`,
        severity: "info",
        actionable: true,
        actionUrl: "/transactions",
      });
    }

    const thisMonthIncome = recentTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const thisMonthExpense = recentTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    if (thisMonthExpense > thisMonthIncome) {
      insights.push({
        type: "trend",
        title: "Expenses exceed income this month",
        description: `Your expenses (£${thisMonthExpense.toFixed(2)}) are higher than your income (£${thisMonthIncome.toFixed(2)}) for the past 30 days.`,
        severity: "warning",
        actionable: true,
        actionUrl: "/reports",
      });
    }

    for (const insight of insights) {
      const existing = await ctx.db
        .query("aiInsights")
        .withIndex("by_church_active", (q) =>
          q.eq("churchId", args.churchId).eq("isDismissed", false)
        )
        .filter((q) => q.eq(q.field("title"), insight.title))
        .first();

      if (!existing) {
        await ctx.db.insert("aiInsights", {
          churchId: args.churchId,
          ...insight,
          isRead: false,
          isDismissed: false,
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
      }
    }

    return insights;
  },
});
