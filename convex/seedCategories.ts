import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// Helper function to create subcategory with keywords
async function createSubcategoryWithKeywords(
  ctx: MutationCtx,
  churchId: Id<"churches">,
  name: string,
  parentId: Id<"categories">,
  type: "income" | "expense",
  keywords: string[]
) {
  // Create subcategory
  const subcategoryId = await ctx.db.insert("categories", {
    churchId,
    name,
    type,
    parentId,
    isSubcategory: true,
    isSystem: true,
  });

  // Add keywords with denormalized categoryType for performance
  for (const keyword of keywords) {
    await ctx.db.insert("categoryKeywords", {
      churchId,
      categoryId: subcategoryId,
      keyword: keyword.toLowerCase().trim(),
      isActive: true,
      categoryType: type, // Denormalized for indexed queries
    });
  }

  return subcategoryId;
}

// Seed Income Categories
export const seedIncomeCategories = mutation({
  args: { churchId: v.id("churches") },
  returns: v.object({
    mainCategories: v.number(),
    subcategories: v.number(),
    keywords: v.number(),
  }),
  handler: async (ctx, args) => {
    let mainCount = 0;
    let subCount = 0;
    let keywordCount = 0;

    // MAIN CATEGORY: Donations
    const donationsId = await ctx.db.insert("categories", {
      churchId: args.churchId,
      name: "Donations",
      type: "income",
      isSubcategory: false,
      isSystem: true,
    });
    mainCount++;

    // Subcategories under Donations
    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Tithe",
      donationsId,
      "income",
      ["tithe", "tithing", "thithe", "tith", "title"]
    );
    subCount++;
    keywordCount += 5;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Offering",
      donationsId,
      "income",
      ["offering", "offer", "off", "pledge", "seed", "sacrifice", "sabbath", "sac", "no ref", "monzo"]
    );
    subCount++;
    keywordCount += 10;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Thanksgiving",
      donationsId,
      "income",
      ["thanks", "thanksgiving", "thx", "tnx"]
    );
    subCount++;
    keywordCount += 4;

    // MAIN CATEGORY: Building Fund
    const buildingFundId = await ctx.db.insert("categories", {
      churchId: args.churchId,
      name: "Building Fund",
      type: "income",
      isSubcategory: false,
      isSystem: true,
    });
    mainCount++;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Building Fund",
      buildingFundId,
      "income",
      ["build", "building", "legacy"]
    );
    subCount++;
    keywordCount += 3;

    // MAIN CATEGORY: Charitable Activities
    const charitableId = await ctx.db.insert("categories", {
      churchId: args.churchId,
      name: "Charitable Activities",
      type: "income",
      isSubcategory: false,
      isSystem: true,
    });
    mainCount++;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Charity Fund",
      charitableId,
      "income",
      ["charity", "charitable", "ch"]
    );
    subCount++;
    keywordCount += 3;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Gender Ministries",
      charitableId,
      "income",
      ["rlm", "men", "wmg", "women", "youth"]
    );
    subCount++;
    keywordCount += 5;

    // MAIN CATEGORY: Other Income
    const otherIncomeId = await ctx.db.insert("categories", {
      churchId: args.churchId,
      name: "Other Income",
      type: "income",
      isSubcategory: false,
      isSystem: true,
    });
    mainCount++;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Merchandise",
      otherIncomeId,
      "income",
      ["tshirt", "merchandise", "merch", "book", "cd"]
    );
    subCount++;
    keywordCount += 5;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Uncategorised",
      otherIncomeId,
      "income",
      ["null"]
    );
    subCount++;
    keywordCount += 1;

    return {
      mainCategories: mainCount,
      subcategories: subCount,
      keywords: keywordCount,
    };
  },
});

// Seed Expense Categories
export const seedExpenseCategories = mutation({
  args: { churchId: v.id("churches") },
  returns: v.object({
    mainCategories: v.number(),
    subcategories: v.number(),
    keywords: v.number(),
  }),
  handler: async (ctx, args) => {
    let mainCount = 0;
    let subCount = 0;
    let keywordCount = 0;

    // MAIN CATEGORY: Major Programs
    const majorProgramsId = await ctx.db.insert("categories", {
      churchId: args.churchId,
      name: "Major Programs",
      type: "expense",
      isSubcategory: false,
      isSystem: true,
    });
    mainCount++;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "MP Honorarium",
      majorProgramsId,
      "expense",
      ["honorarium", "speaker", "guest minister", "preacher"]
    );
    subCount++;
    keywordCount += 4;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "MP Accommodation",
      majorProgramsId,
      "expense",
      ["hotel", "accommodation", "lodging", "airbnb"]
    );
    subCount++;
    keywordCount += 4;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "MP Refreshments",
      majorProgramsId,
      "expense",
      ["catering", "food", "refreshment", "meal"]
    );
    subCount++;
    keywordCount += 4;

    // MAIN CATEGORY: Ministry Costs
    const ministryCostsId = await ctx.db.insert("categories", {
      churchId: args.churchId,
      name: "Ministry Costs",
      type: "expense",
      isSubcategory: false,
      isSystem: true,
    });
    mainCount++;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Church Provisions & Materials",
      ministryCostsId,
      "expense",
      ["provision", "material", "supplies", "equipment"]
    );
    subCount++;
    keywordCount += 4;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Travel & Transport",
      ministryCostsId,
      "expense",
      ["transport", "travel", "fuel", "petrol", "uber", "taxi"]
    );
    subCount++;
    keywordCount += 6;

    // MAIN CATEGORY: Staff & Volunteer Costs
    const staffCostsId = await ctx.db.insert("categories", {
      churchId: args.churchId,
      name: "Staff & Volunteer Costs",
      type: "expense",
      isSubcategory: false,
      isSystem: true,
    });
    mainCount++;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Gross Salary",
      staffCostsId,
      "expense",
      ["salary", "wage", "pay", "remuneration"]
    );
    subCount++;
    keywordCount += 4;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Allowances",
      staffCostsId,
      "expense",
      ["allowance", "stipend", "volunteer"]
    );
    subCount++;
    keywordCount += 3;

    // MAIN CATEGORY: Premises Costs
    const premisesCostsId = await ctx.db.insert("categories", {
      churchId: args.churchId,
      name: "Premises Costs",
      type: "expense",
      isSubcategory: false,
      isSystem: true,
    });
    mainCount++;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Rent-Premises",
      premisesCostsId,
      "expense",
      ["rent", "lease", "premises"]
    );
    subCount++;
    keywordCount += 3;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Utilities",
      premisesCostsId,
      "expense",
      ["electricity", "gas", "water", "utility", "council tax"]
    );
    subCount++;
    keywordCount += 5;

    // MAIN CATEGORY: Mission Costs
    const missionCostsId = await ctx.db.insert("categories", {
      churchId: args.churchId,
      name: "Mission Costs",
      type: "expense",
      isSubcategory: false,
      isSystem: true,
    });
    mainCount++;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Missions-Tithe",
      missionCostsId,
      "expense",
      ["mission tithe", "hq", "headquarters", "slm suppt"]
    );
    subCount++;
    keywordCount += 4;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Mission Support",
      missionCostsId,
      "expense",
      ["mission support", "missionary", "outreach"]
    );
    subCount++;
    keywordCount += 3;

    // MAIN CATEGORY: Admin & Governance
    const adminId = await ctx.db.insert("categories", {
      churchId: args.churchId,
      name: "Admin & Governance",
      type: "expense",
      isSubcategory: false,
      isSystem: true,
    });
    mainCount++;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "Bank Charges",
      adminId,
      "expense",
      ["bank charge", "bank fee", "transaction fee"]
    );
    subCount++;
    keywordCount += 3;

    await createSubcategoryWithKeywords(
      ctx,
      args.churchId,
      "IT Costs",
      adminId,
      "expense",
      ["software", "internet", "website", "zoom", "microsoft"]
    );
    subCount++;
    keywordCount += 5;

    return {
      mainCategories: mainCount,
      subcategories: subCount,
      keywords: keywordCount,
    };
  },
});

// Seed both income and expense categories
export const seedAllCategories = mutation({
  args: { churchId: v.id("churches") },
  returns: v.object({
    income: v.object({
      mainCategories: v.number(),
      subcategories: v.number(),
      keywords: v.number(),
    }),
    expense: v.object({
      mainCategories: v.number(),
      subcategories: v.number(),
      keywords: v.number(),
    }),
    totalCategories: v.number(),
    totalKeywords: v.number(),
  }),
  handler: async (ctx, args) => {
    // Check if categories already exist
    const existingCategories = await ctx.db
      .query("categories")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isSystem"), true))
      .collect();

    if (existingCategories.length > 0) {
      throw new Error(
        `Categories already exist for this church. Found ${existingCategories.length} system categories.`
      );
    }

    let incomeMain = 0, incomeSub = 0, incomeKw = 0;
    let expenseMain = 0, expenseSub = 0, expenseKw = 0;

    // ===== INCOME CATEGORIES =====

    // Donations
    const donationsId = await ctx.db.insert("categories", {
      churchId: args.churchId, name: "Donations", type: "income",
      isSubcategory: false, isSystem: true,
    });
    incomeMain++;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Tithe", donationsId, "income",
      ["tithe", "tithing", "thithe", "tith", "title"]);
    incomeSub++; incomeKw += 5;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Offering", donationsId, "income",
      ["offering", "offer", "off", "pledge", "seed", "sacrifice", "sabbath", "sac", "no ref", "monzo"]);
    incomeSub++; incomeKw += 10;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Thanksgiving", donationsId, "income",
      ["thanks", "thanksgiving", "thx", "tnx"]);
    incomeSub++; incomeKw += 4;

    // Building Fund
    const buildingFundId = await ctx.db.insert("categories", {
      churchId: args.churchId, name: "Building Fund", type: "income",
      isSubcategory: false, isSystem: true,
    });
    incomeMain++;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Building Fund", buildingFundId, "income",
      ["build", "building", "legacy"]);
    incomeSub++; incomeKw += 3;

    // Charitable Activities
    const charitableId = await ctx.db.insert("categories", {
      churchId: args.churchId, name: "Charitable Activities", type: "income",
      isSubcategory: false, isSystem: true,
    });
    incomeMain++;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Charity Fund", charitableId, "income",
      ["charity", "charitable", "ch"]);
    incomeSub++; incomeKw += 3;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Gender Ministries", charitableId, "income",
      ["rlm", "men", "wmg", "women", "youth"]);
    incomeSub++; incomeKw += 5;

    // Other Income
    const otherIncomeId = await ctx.db.insert("categories", {
      churchId: args.churchId, name: "Other Income", type: "income",
      isSubcategory: false, isSystem: true,
    });
    incomeMain++;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Merchandise", otherIncomeId, "income",
      ["tshirt", "merchandise", "merch", "book", "cd"]);
    incomeSub++; incomeKw += 5;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Uncategorised", otherIncomeId, "income",
      ["null"]);
    incomeSub++; incomeKw += 1;

    // ===== EXPENSE CATEGORIES =====

    // Major Programs
    const majorProgramsId = await ctx.db.insert("categories", {
      churchId: args.churchId, name: "Major Programs", type: "expense",
      isSubcategory: false, isSystem: true,
    });
    expenseMain++;

    await createSubcategoryWithKeywords(ctx, args.churchId, "MP Honorarium", majorProgramsId, "expense",
      ["honorarium", "speaker", "guest minister", "preacher"]);
    expenseSub++; expenseKw += 4;

    await createSubcategoryWithKeywords(ctx, args.churchId, "MP Accommodation", majorProgramsId, "expense",
      ["hotel", "accommodation", "lodging", "airbnb"]);
    expenseSub++; expenseKw += 4;

    await createSubcategoryWithKeywords(ctx, args.churchId, "MP Refreshments", majorProgramsId, "expense",
      ["catering", "food", "refreshment", "meal"]);
    expenseSub++; expenseKw += 4;

    // Ministry Costs
    const ministryCostsId = await ctx.db.insert("categories", {
      churchId: args.churchId, name: "Ministry Costs", type: "expense",
      isSubcategory: false, isSystem: true,
    });
    expenseMain++;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Church Provisions & Materials", ministryCostsId, "expense",
      ["provision", "material", "supplies", "equipment"]);
    expenseSub++; expenseKw += 4;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Travel & Transport", ministryCostsId, "expense",
      ["transport", "travel", "fuel", "petrol", "uber", "taxi"]);
    expenseSub++; expenseKw += 6;

    // Staff & Volunteer Costs
    const staffCostsId = await ctx.db.insert("categories", {
      churchId: args.churchId, name: "Staff & Volunteer Costs", type: "expense",
      isSubcategory: false, isSystem: true,
    });
    expenseMain++;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Gross Salary", staffCostsId, "expense",
      ["salary", "wage", "pay", "remuneration"]);
    expenseSub++; expenseKw += 4;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Allowances", staffCostsId, "expense",
      ["allowance", "stipend", "volunteer"]);
    expenseSub++; expenseKw += 3;

    // Premises Costs
    const premisesCostsId = await ctx.db.insert("categories", {
      churchId: args.churchId, name: "Premises Costs", type: "expense",
      isSubcategory: false, isSystem: true,
    });
    expenseMain++;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Rent-Premises", premisesCostsId, "expense",
      ["rent", "lease", "premises"]);
    expenseSub++; expenseKw += 3;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Utilities", premisesCostsId, "expense",
      ["electricity", "gas", "water", "utility", "council tax"]);
    expenseSub++; expenseKw += 5;

    // Mission Costs
    const missionCostsId = await ctx.db.insert("categories", {
      churchId: args.churchId, name: "Mission Costs", type: "expense",
      isSubcategory: false, isSystem: true,
    });
    expenseMain++;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Missions-Tithe", missionCostsId, "expense",
      ["mission tithe", "hq", "headquarters", "slm suppt"]);
    expenseSub++; expenseKw += 4;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Mission Support", missionCostsId, "expense",
      ["mission support", "missionary", "outreach"]);
    expenseSub++; expenseKw += 3;

    // Admin & Governance
    const adminId = await ctx.db.insert("categories", {
      churchId: args.churchId, name: "Admin & Governance", type: "expense",
      isSubcategory: false, isSystem: true,
    });
    expenseMain++;

    await createSubcategoryWithKeywords(ctx, args.churchId, "Bank Charges", adminId, "expense",
      ["bank charge", "bank fee", "transaction fee"]);
    expenseSub++; expenseKw += 3;

    await createSubcategoryWithKeywords(ctx, args.churchId, "IT Costs", adminId, "expense",
      ["software", "internet", "website", "zoom", "microsoft"]);
    expenseSub++; expenseKw += 5;

    return {
      income: { mainCategories: incomeMain, subcategories: incomeSub, keywords: incomeKw },
      expense: { mainCategories: expenseMain, subcategories: expenseSub, keywords: expenseKw },
      totalCategories: incomeMain + expenseMain + incomeSub + expenseSub,
      totalKeywords: incomeKw + expenseKw,
    };
  },
});
