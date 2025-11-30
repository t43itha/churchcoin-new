import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listChurches = query({
  args: {},
  handler: async (ctx) => {
    const churches = await ctx.db.query("churches").collect();
    return churches.map((church) => sanitizeChurch(church));
  },
});

// Get church by ID
export const getChurch = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    return church ? sanitizeChurch(church) : null;
  },
});

type ChurchWithSettings = {
  settings?: {
    aiApiKey?: string;
    [key: string]: unknown;
  };
};

const sanitizeChurch = <T extends ChurchWithSettings | null>(church: T): T => {
  if (!church) return church;
  const settings = church.settings ?? {};
  const { aiApiKey, ...restSettings } = settings;
  return {
    ...church,
    settings: {
      ...restSettings,
      aiApiKey: aiApiKey ? "********" : undefined,
    },
  } as T;
};

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
    const churchId = await ctx.db.insert("churches", {
      ...args,
      settings: {
        ...args.settings,
        importsAllowAi: true,
      },
    });

    // Create default funds for the church
    await ctx.db.insert("funds", {
      churchId,
      name: "General Fund",
      type: "general",
      balance: 0,
      description: "General church fund for unrestricted donations",
      isFundraising: false,
      isActive: true,
    });

    await ctx.db.insert("funds", {
      churchId,
      name: "Building Fund",
      type: "restricted",
      balance: 0,
      description: "Restricted fund for building maintenance and improvements",
      restrictions: "Building maintenance, repairs, and capital improvements only",
      isFundraising: false,
      isActive: true,
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
        parentId: undefined,
        isSubcategory: false,
        isSystem: true,
      });
    }

    for (const category of expenseCategories) {
      await ctx.db.insert("categories", {
        churchId,
        name: category,
        type: "expense",
        parentId: undefined,
        isSubcategory: false,
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
      defaultFundId: v.optional(v.id("funds")),
      autoApproveThreshold: v.optional(v.number()),
      enableAiCategorization: v.optional(v.boolean()),
      importsAllowAi: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) {
      throw new Error("Church not found");
    }

    await ctx.db.patch(args.churchId, {
      settings: {
        ...(church.settings ?? {}),
        ...args.settings,
      },
    });
  },
});

// Set default fund for import automation
export const setDefaultFund = mutation({
  args: {
    churchId: v.id("churches"),
    fundId: v.id("funds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) {
      throw new Error("Church not found");
    }

    await ctx.db.patch(args.churchId, {
      settings: {
        ...(church.settings ?? {}),
        defaultFundId: args.fundId,
      },
    });
    return null;
  },
});

// Set auto-approve threshold
export const setAutoApproveThreshold = mutation({
  args: {
    churchId: v.id("churches"),
    threshold: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) {
      throw new Error("Church not found");
    }

    await ctx.db.patch(args.churchId, {
      settings: {
        ...(church.settings ?? {}),
        autoApproveThreshold: args.threshold,
      },
    });
    return null;
  },
});

// Toggle AI categorization
export const setEnableAiCategorization = mutation({
  args: {
    churchId: v.id("churches"),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) {
      throw new Error("Church not found");
    }

    await ctx.db.patch(args.churchId, {
      settings: {
        ...(church.settings ?? {}),
        enableAiCategorization: args.enabled,
        importsAllowAi: args.enabled,
      },
    });
    return null;
  },
});

export const setImportsAllowAi = mutation({
  args: {
    churchId: v.id("churches"),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) {
      throw new Error("Church not found");
    }

    await ctx.db.patch(args.churchId, {
      settings: {
        ...(church.settings ?? {}),
        importsAllowAi: args.enabled,
      },
    });
    return null;
  },
});

export const updateAiApiKey = mutation({
  args: {
    churchId: v.id("churches"),
    apiKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) {
      throw new Error("Church not found");
    }

    const trimmed = args.apiKey.trim();

    await ctx.db.patch(args.churchId, {
      settings: {
        ...(church.settings ?? {}),
        aiApiKey: trimmed.length > 0 ? trimmed : undefined,
      },
    });

    return null;
  },
});

// Set default fund for Plaid bank imports
export const setPlaidDefaultFund = mutation({
  args: {
    churchId: v.id("churches"),
    fundId: v.id("funds"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) {
      throw new Error("Church not found");
    }

    await ctx.db.patch(args.churchId, {
      settings: {
        ...(church.settings ?? {}),
        plaidDefaultFundId: args.fundId,
      },
    });
    return null;
  },
});

// Get default fund (or first general fund as fallback)
export const getDefaultFund = query({
  args: { churchId: v.id("churches") },
  returns: v.union(v.object({
    _id: v.id("funds"),
    churchId: v.id("churches"),
    name: v.string(),
    type: v.union(v.literal("general"), v.literal("restricted"), v.literal("designated")),
    balance: v.number(),
    description: v.optional(v.string()),
    restrictions: v.optional(v.string()),
    isFundraising: v.boolean(),
    fundraisingTarget: v.optional(v.number()),
    isActive: v.boolean(),
    _creationTime: v.number(),
  }), v.null()),
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);

    // Return configured default fund
    if (church?.settings.defaultFundId) {
      const defaultFund = await ctx.db.get(church.settings.defaultFundId);
      if (defaultFund) return defaultFund;
    }

    // Fallback to first general fund
    const generalFund = await ctx.db
      .query("funds")
      .withIndex("by_type", (q) =>
        q.eq("churchId", args.churchId).eq("type", "general")
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return generalFund || null;
  },
});
