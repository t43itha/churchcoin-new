import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listChurches = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("churches").collect();
  },
});

// Get church by ID
export const getChurch = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.churchId);
  },
});

// Create a new church
export const createChurch = mutation({
  args: {
    name: v.string(),
    charityNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    settings: v.object({
      fiscalYearEnd: v.string(),
      giftAidEnabled: v.boolean(),
      defaultCurrency: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const churchId = await ctx.db.insert("churches", args);

    // Create default funds for the church
    await ctx.db.insert("funds", {
      churchId,
      name: "General Fund",
      type: "general",
      balance: 0,
      description: "General church fund for unrestricted donations",
      isActive: true,
      isFundraising: false,
    });

    await ctx.db.insert("funds", {
      churchId,
      name: "Building Fund",
      type: "restricted",
      balance: 0,
      description: "Restricted fund for building maintenance and improvements",
      restrictions: "Building maintenance, repairs, and capital improvements only",
      isActive: true,
      isFundraising: false,
    });

    // Create default categories
    const incomeCategories = [
      "Sunday Collection",
      "Midweek Donations",
      "Gift Aid Claims",
      "Special Collections",
      "Events Income",
      "Bank Interest",
    ];

    const expenseCategories = [
      "Utilities",
      "Insurance",
      "Repairs & Maintenance",
      "Office Expenses",
      "Ministry Expenses",
      "Charitable Giving",
      "Bank Charges",
    ];

    for (const category of incomeCategories) {
      await ctx.db.insert("categories", {
        churchId,
        name: category,
        type: "income",
        isSystem: true,
      });
    }

    for (const category of expenseCategories) {
      await ctx.db.insert("categories", {
        churchId,
        name: category,
        type: "expense",
        isSystem: true,
      });
    }

    return churchId;
  },
});

// Update church settings
export const updateChurchSettings = mutation({
  args: {
    churchId: v.id("churches"),
    settings: v.object({
      fiscalYearEnd: v.string(),
      giftAidEnabled: v.boolean(),
      defaultCurrency: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.churchId, {
      settings: args.settings,
    });
  },
});
