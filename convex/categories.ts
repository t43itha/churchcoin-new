import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Import auth utilities
import {
  requireWritePermission,
  requireAdminPermission,
  verifyCategoryOwnership,
  verifyCategoryKeywordOwnership,
} from "./lib/auth";

export const getCategories = query({
  args: {
    churchId: v.id("churches"),
    type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
  },
  handler: async (ctx, args) => {
    const baseQuery = args.type
      ? ctx.db
          .query("categories")
          .withIndex("by_type", (q) =>
            q.eq("churchId", args.churchId).eq("type", args.type!)
          )
      : ctx.db
          .query("categories")
          .withIndex("by_church", (q) => q.eq("churchId", args.churchId));

    const categories = await baseQuery.collect();

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getSubcategoriesWithParents = query({
  args: {
    churchId: v.id("churches"),
    type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
  },
  returns: v.array(v.object({
    _id: v.id("categories"),
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    parentName: v.optional(v.string()),
    displayName: v.string(),
  })),
  handler: async (ctx, args) => {
    // Get only subcategories
    const subcategories = args.type
      ? await ctx.db
          .query("categories")
          .withIndex("by_type", (q) =>
            q.eq("churchId", args.churchId).eq("type", args.type!)
          )
          .filter((q) => q.eq(q.field("isSubcategory"), true))
          .collect()
      : await ctx.db
          .query("categories")
          .withIndex("by_subcategory", (q) =>
            q.eq("churchId", args.churchId).eq("isSubcategory", true)
          )
          .collect();

    // Get parent names for all subcategories
    const subcategoriesWithParents = await Promise.all(
      subcategories.map(async (subcategory) => {
        let parentName: string | undefined;
        if (subcategory.parentId) {
          const parent = await ctx.db.get(subcategory.parentId);
          parentName = parent?.name;
        }

        const displayName = parentName
          ? `${parentName} → ${subcategory.name}`
          : subcategory.name;

        return {
          _id: subcategory._id,
          name: subcategory.name,
          type: subcategory.type,
          parentName,
          displayName,
        };
      })
    );

    return subcategoriesWithParents.sort((a, b) => a.displayName.localeCompare(b.displayName));
  },
});

// Create a new main category (secured)
export const createMainCategory = mutation({
  args: {
    // churchId kept for backward compatibility but verified against auth
    churchId: v.optional(v.id("churches")),
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    // Authenticate and authorize
    const church = await requireWritePermission(ctx);

    return await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: args.name,
      type: args.type,
      parentId: undefined,
      isSubcategory: false,
      isSystem: false,
    });
  },
});

// Create a new subcategory (secured)
export const createSubcategory = mutation({
  args: {
    // churchId kept for backward compatibility but verified against auth
    churchId: v.optional(v.id("churches")),
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    parentId: v.id("categories"),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    // Authenticate and authorize
    const church = await requireWritePermission(ctx);

    // Verify parent exists, belongs to church, and is a main category
    const parent = await verifyCategoryOwnership(ctx, args.parentId);
    if (parent.isSubcategory) {
      throw new Error("Parent must be a main category");
    }

    return await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: args.name,
      type: args.type,
      parentId: args.parentId,
      isSubcategory: true,
      isSystem: false,
    });
  },
});

// Add a keyword to a subcategory (secured)
export const addKeywordToSubcategory = mutation({
  args: {
    // churchId kept for backward compatibility but verified against auth
    churchId: v.optional(v.id("churches")),
    categoryId: v.id("categories"),
    keyword: v.string(),
  },
  returns: v.id("categoryKeywords"),
  handler: async (ctx, args) => {
    // Authenticate and authorize
    const church = await requireWritePermission(ctx);

    // Verify category exists, belongs to church, and is a subcategory
    const category = await verifyCategoryOwnership(ctx, args.categoryId);
    if (!category.isSubcategory) {
      throw new Error("Keywords can only be added to subcategories");
    }

    // Check if keyword already exists for this category
    const existing = await ctx.db
      .query("categoryKeywords")
      .withIndex("by_keyword", (q) =>
        q.eq("churchId", church.churchId).eq("keyword", args.keyword.toLowerCase().trim())
      )
      .filter((q) => q.eq(q.field("categoryId"), args.categoryId))
      .first();

    if (existing) {
      throw new Error("Keyword already exists for this category");
    }

    return await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: args.categoryId,
      keyword: args.keyword.toLowerCase().trim(),
      isActive: true,
      categoryType: category.type, // Denormalized for performance
    });
  },
});

// Remove a keyword from a subcategory (secured)
export const removeKeywordFromSubcategory = mutation({
  args: {
    keywordId: v.id("categoryKeywords"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate and authorize
    await requireWritePermission(ctx);

    // Verify keyword belongs to user's church
    await verifyCategoryKeywordOwnership(ctx, args.keywordId);

    await ctx.db.delete(args.keywordId);
    return null;
  },
});

export const getCategoryKeywords = query({
  args: {
    churchId: v.id("churches"),
    categoryId: v.optional(v.id("categories")),
  },
  returns: v.array(v.object({
    _id: v.id("categoryKeywords"),
    categoryId: v.id("categories"),
    keyword: v.string(),
    isActive: v.boolean(),
    categoryName: v.string(),
    parentName: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const keywords = args.categoryId
      ? await ctx.db
          .query("categoryKeywords")
          .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
          .collect()
      : await ctx.db
          .query("categoryKeywords")
          .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
          .collect();

    // Get category names for each keyword
    const keywordsWithNames = await Promise.all(
      keywords.map(async (keyword) => {
        const category = await ctx.db.get(keyword.categoryId);
        let parentName: string | undefined;

        if (category?.parentId) {
          const parent = await ctx.db.get(category.parentId);
          parentName = parent?.name;
        }

        return {
          _id: keyword._id,
          categoryId: keyword.categoryId,
          keyword: keyword.keyword,
          isActive: keyword.isActive,
          categoryName: category?.name || "Unknown",
          parentName,
        };
      })
    );

    return keywordsWithNames.sort((a, b) => a.keyword.localeCompare(b.keyword));
  },
});

// Update a category (secured)
export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate and authorize
    await requireWritePermission(ctx);

    // Verify category belongs to user's church
    await verifyCategoryOwnership(ctx, args.categoryId);

    await ctx.db.patch(args.categoryId, {
      name: args.name,
    });
    return null;
  },
});

// Delete a category (secured - requires admin permission)
export const deleteCategory = mutation({
  args: {
    categoryId: v.id("categories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate and authorize (admin required for delete)
    await requireAdminPermission(ctx);

    // Verify category belongs to user's church
    const category = await verifyCategoryOwnership(ctx, args.categoryId);

    // Check if category is in use by transactions
    const transactionsCount = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("categoryId"), args.categoryId))
      .collect()
      .then((results) => results.length);

    if (transactionsCount > 0) {
      throw new Error("Cannot delete category that is in use by transactions");
    }

    // If it's a main category, delete all subcategories and their keywords
    if (!category.isSubcategory) {
      const subcategories = await ctx.db
        .query("categories")
        .withIndex("by_church", (q) => q.eq("churchId", category.churchId))
        .filter((q) => q.eq(q.field("parentId"), args.categoryId))
        .collect();

      for (const subcategory of subcategories) {
        // Delete keywords for this subcategory
        const keywords = await ctx.db
          .query("categoryKeywords")
          .withIndex("by_category", (q) => q.eq("categoryId", subcategory._id))
          .collect();

        for (const keyword of keywords) {
          await ctx.db.delete(keyword._id);
        }

        // Delete the subcategory
        await ctx.db.delete(subcategory._id);
      }
    } else {
      // If it's a subcategory, delete its keywords
      const keywords = await ctx.db
        .query("categoryKeywords")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
        .collect();

      for (const keyword of keywords) {
        await ctx.db.delete(keyword._id);
      }
    }

    // Delete the category itself
    await ctx.db.delete(args.categoryId);
    return null;
  },
});

// Seed default categories for a church (secured - requires admin permission)
export const seedCategories = mutation({
  args: {
    // churchId kept for backward compatibility but verified against auth
    churchId: v.optional(v.id("churches")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate and authorize (admin required for seeding)
    const church = await requireAdminPermission(ctx);

    // Check if categories already exist for this church
    const existingCategories = await ctx.db
      .query("categories")
      .withIndex("by_church", (q) => q.eq("churchId", church.churchId))
      .collect();

    if (existingCategories.length > 0) {
      console.log("Categories already exist for this church");
      return null;
    }

    // Create Income main categories
    const donationsId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Donations",
      type: "income",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    const charitableActivitiesId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Charitable Activities",
      type: "income",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    const otherIncomeMainId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Separate Material Item of Income",
      type: "income",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    // Create Income subcategories
    const offeringsId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Offerings",
      type: "income",
      parentId: donationsId,
      isSubcategory: true,
      isSystem: true,
    });

    const tithesId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Tithes & First Fruits",
      type: "income",
      parentId: donationsId,
      isSubcategory: true,
      isSystem: true,
    });

    const thanksgivingId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Thanksgiving",
      type: "income",
      parentId: donationsId,
      isSubcategory: true,
      isSystem: true,
    });

    const programsId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Programs",
      type: "income",
      parentId: donationsId,
      isSubcategory: true,
      isSystem: true,
    });

    const genderMinistriesId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Gender Ministries (RLM, MEN, WMG ETC)",
      type: "income",
      parentId: charitableActivitiesId,
      isSubcategory: true,
      isSystem: true,
    });

    const otherIncomeId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Other Income",
      type: "income",
      parentId: otherIncomeMainId,
      isSubcategory: true,
      isSystem: true,
    });

    // Create Expense main categories
    const majorProgramId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Major Program",
      type: "expense",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    const ministryCostId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Ministry Cost",
      type: "expense",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    const staffCostId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Staff Cost",
      type: "expense",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    const volunteerCostId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Volunteer Cost",
      type: "expense",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    const premisesCostId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Premises Cost",
      type: "expense",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    const missionCostId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Mission Cost",
      type: "expense",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    const governanceId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Governance",
      type: "expense",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    const adminCostId = await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Admin Cost",
      type: "expense",
      parentId: undefined,
      isSubcategory: false,
      isSystem: true,
    });

    // Create Expense subcategories

    // Major Program subcategories
    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "MP Honorarium",
      type: "expense",
      parentId: majorProgramId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "MP Hotels Accommodation",
      type: "expense",
      parentId: majorProgramId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "MP Food and Refreshments",
      type: "expense",
      parentId: majorProgramId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "MP Expense",
      type: "expense",
      parentId: majorProgramId,
      isSubcategory: true,
      isSystem: true,
    });

    // Ministry Cost subcategories
    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Church Provisions & Materials",
      type: "expense",
      parentId: ministryCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Travel & Transport Cost",
      type: "expense",
      parentId: ministryCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Vehicle Maintenance, Insurance & Other Cost",
      type: "expense",
      parentId: ministryCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Equipment Purchase & Maintenance",
      type: "expense",
      parentId: ministryCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Church Refreshment",
      type: "expense",
      parentId: ministryCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Media & Publicity",
      type: "expense",
      parentId: ministryCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Gender Ministry Activities Cost",
      type: "expense",
      parentId: ministryCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Other Ministry Costs",
      type: "expense",
      parentId: ministryCostId,
      isSubcategory: true,
      isSystem: true,
    });

    // Staff Cost subcategories
    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Gross Salary",
      type: "expense",
      parentId: staffCostId,
      isSubcategory: true,
      isSystem: true,
    });

    // Volunteer Cost subcategories
    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Allowances",
      type: "expense",
      parentId: volunteerCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Honorarium",
      type: "expense",
      parentId: volunteerCostId,
      isSubcategory: true,
      isSystem: true,
    });

    // Premises Cost subcategories
    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Rent-Premises",
      type: "expense",
      parentId: premisesCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Rent-Manse",
      type: "expense",
      parentId: premisesCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Rent Non Contract & Adhoc",
      type: "expense",
      parentId: premisesCostId,
      isSubcategory: true,
      isSystem: true,
    });

    // Mission Cost subcategories
    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Missions -Tithe",
      type: "expense",
      parentId: missionCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Missions - Other Missions Cost",
      type: "expense",
      parentId: missionCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Missions - Overseas Travel",
      type: "expense",
      parentId: missionCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Mission Support - Donation and Gifts",
      type: "expense",
      parentId: missionCostId,
      isSubcategory: true,
      isSystem: true,
    });

    // Governance subcategories
    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Training",
      type: "expense",
      parentId: governanceId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Fees & License",
      type: "expense",
      parentId: governanceId,
      isSubcategory: true,
      isSystem: true,
    });

    // Admin Cost subcategories
    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "IT costs",
      type: "expense",
      parentId: adminCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Telephones & Internet",
      type: "expense",
      parentId: adminCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Stationery & Printing",
      type: "expense",
      parentId: adminCostId,
      isSubcategory: true,
      isSystem: true,
    });

    await ctx.db.insert("categories", {
      churchId: church.churchId,
      name: "Bank Charges",
      type: "expense",
      parentId: adminCostId,
      isSubcategory: true,
      isSystem: true,
    });

    // Add keywords for automatic categorization
    await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: tithesId,
      keyword: "tithe",
      isActive: true,
      categoryType: "income",
    });

    await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: tithesId,
      keyword: "tithing",
      isActive: true,
      categoryType: "income",
    });

    await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: tithesId,
      keyword: "thithe",
      isActive: true,
      categoryType: "income",
    });

    await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: thanksgivingId,
      keyword: "thanks",
      isActive: true,
      categoryType: "income",
    });

    await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: thanksgivingId,
      keyword: "thanksgiving",
      isActive: true,
      categoryType: "income",
    });

    await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: thanksgivingId,
      keyword: "thx",
      isActive: true,
      categoryType: "income",
    });

    await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: offeringsId,
      keyword: "pledge",
      isActive: true,
      categoryType: "income",
    });

    await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: offeringsId,
      keyword: "offering",
      isActive: true,
      categoryType: "income",
    });

    await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: offeringsId,
      keyword: "seed",
      isActive: true,
      categoryType: "income",
    });

    await ctx.db.insert("categoryKeywords", {
      churchId: church.churchId,
      categoryId: offeringsId,
      keyword: "sacrifice",
      isActive: true,
      categoryType: "income",
    });

    console.log("Categories seeded successfully");
    return null;
  },
});
