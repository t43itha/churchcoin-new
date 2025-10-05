import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import Fuse from "fuse.js";
import {
  createTransactionInternal,
  findDuplicateTransactions,
  type CreateTransactionInput,
} from "./transactions";
import { internal } from "./_generated/api";

// Donor matching function - matches by bank reference or fuzzy name search
async function matchDonor(
  ctx: MutationCtx,
  churchId: Id<"churches">,
  description: string,
  reference?: string
): Promise<{ donorId?: Id<"donors">; confidence: number }> {

  // 1. Exact bank reference match (highest confidence)
  if (reference && reference.trim().length > 0) {
    const exactMatch = await ctx.db
      .query("donors")
      .withIndex("by_reference", (q) =>
        q.eq("churchId", churchId).eq("bankReference", reference.trim())
      )
      .first();

    if (exactMatch) {
      return { donorId: exactMatch._id, confidence: 1.0 };
    }
  }

  // 2. Fuzzy name match in description
  const donors = await ctx.db
    .query("donors")
    .withIndex("by_church", (q) => q.eq("churchId", churchId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  if (donors.length === 0) {
    return { confidence: 0 };
  }

  const fuse = new Fuse(donors, {
    keys: ["name", "email"],
    threshold: 0.3,
    includeScore: true,
  });

  const results = fuse.search(description);

  if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.3) {
    return {
      donorId: results[0].item._id,
      confidence: 1 - results[0].score, // Convert score to confidence (lower score = better match)
    };
  }

  return { confidence: 0 };
}

// Category detection function for subcategories only
async function detectSubcategory(
  ctx: MutationCtx,
  churchId: Id<"churches">,
  description: string
): Promise<{ categoryId: Id<"categories"> | null; confidence: number; source: string }> {
  if (!description || description.trim().length === 0) {
    return { categoryId: null, confidence: 0, source: "none" };
  }

  // Get all active keywords for subcategories in this church
  const keywords = await ctx.db
    .query("categoryKeywords")
    .withIndex("by_church", (q) => q.eq("churchId", churchId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  if (keywords.length === 0) {
    return { categoryId: null, confidence: 0, source: "none" };
  }

  // Clean and prepare description for matching
  const cleanDescription = description.toLowerCase().trim();
  const descriptionWords = cleanDescription.split(/\s+/);

  // Track matches with confidence scores
  const matches: { categoryId: string; confidence: number; matchedKeyword: string }[] = [];

  for (const keywordRecord of keywords) {
    const keyword = keywordRecord.keyword.toLowerCase().trim();

    // Exact phrase match (highest confidence)
    if (cleanDescription.includes(keyword)) {
      matches.push({
        categoryId: keywordRecord.categoryId,
        confidence: 10,
        matchedKeyword: keyword,
      });
      continue;
    }

    // Word boundary match (medium confidence)
    const keywordWords = keyword.split(/\s+/);
    if (keywordWords.length === 1) {
      // Single word keyword
      if (descriptionWords.includes(keyword)) {
        matches.push({
          categoryId: keywordRecord.categoryId,
          confidence: 5,
          matchedKeyword: keyword,
        });
      }
    } else {
      // Multi-word keyword - check if all words are present
      const allWordsPresent = keywordWords.every(word =>
        descriptionWords.includes(word)
      );
      if (allWordsPresent) {
        matches.push({
          categoryId: keywordRecord.categoryId,
          confidence: 7,
          matchedKeyword: keyword,
        });
      }
    }
  }

  if (matches.length === 0) {
    return { categoryId: null, confidence: 0, source: "none" };
  }

  // Sort by confidence and return the best match
  matches.sort((a, b) => b.confidence - a.confidence);

  // Verify the category still exists and is a subcategory
  const category = await ctx.db
    .query("categories")
    .withIndex("by_church", (q) => q.eq("churchId", churchId))
    .filter((q) => q.eq(q.field("_id"), matches[0].categoryId as Id<"categories">))
    .filter((q) => q.eq(q.field("isSubcategory"), true))
    .first();

  if (category) {
    return {
      categoryId: matches[0].categoryId as Id<"categories">,
      confidence: 1.0, // Keyword matches are high confidence
      source: "keyword"
    };
  }

  return { categoryId: null, confidence: 0, source: "none" };
}

// Multi-tier category detection: keyword → AI → manual
async function detectCategoryWithAI(
  ctx: MutationCtx,
  churchId: Id<"churches">,
  description: string,
  amount: number,
  enableAI: boolean = true
): Promise<{ categoryId: Id<"categories"> | null; confidence: number; source: string }> {
  // Tier 1: Keyword matching (free, fast)
  const keywordResult = await detectSubcategory(ctx, churchId, description);
  if (keywordResult.categoryId) {
    return keywordResult;
  }

  // Tier 2: AI categorization (paid, only if enabled)
  if (!enableAI) {
    return { categoryId: null, confidence: 0, source: "none" };
  }

  // Get all categories for this church
  const categories = await ctx.db
    .query("categories")
    .withIndex("by_church", (q) => q.eq("churchId", churchId))
    .filter((q) => q.eq(q.field("isSubcategory"), true))
    .collect();

  if (categories.length === 0) {
    return { categoryId: null, confidence: 0, source: "none" };
  }

  // Call AI suggestion (DeepSeek)
  try {
    const suggestion = await ctx.runMutation(internal.ai.suggestCategoryInternal, {
      churchId,
      description,
      amount,
      categories: categories.map(c => ({
        id: c._id,
        name: c.name,
        type: c.type,
      })),
    });

    if (suggestion.categoryId && suggestion.confidence >= 0.7) {
      return {
        categoryId: suggestion.categoryId as Id<"categories">,
        confidence: suggestion.confidence,
        source: "ai"
      };
    }
  } catch (error) {
    console.error("AI categorization failed:", error);
    // Fall through to manual
  }

  // Tier 3: Manual review required
  return { categoryId: null, confidence: 0, source: "manual" };
}

// Single atomic mutation to create import and save rows
export const createImportWithRows = mutation({
  args: {
    churchId: v.id("churches"),
    filename: v.string(),
    bankFormat: v.union(
      v.literal("barclays"),
      v.literal("hsbc"),
      v.literal("metrobank"),
      v.literal("generic")
    ),
    mapping: v.object({
      date: v.string(),
      description: v.string(),
      amount: v.string(),
      amountIn: v.optional(v.string()),
      amountOut: v.optional(v.string()),
      reference: v.optional(v.string()),
      type: v.optional(v.string()),
    }),
    rows: v.array(
      v.object({
        date: v.string(),
        description: v.string(),
        amount: v.number(),
        reference: v.optional(v.string()),
        type: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get church settings and default fund
    const church = await ctx.db.get(args.churchId);
    if (!church) {
      throw new Error("Church not found");
    }

    // Get default fund (either configured or first general fund)
    let defaultFund = null;
    if (church.settings.defaultFundId) {
      defaultFund = await ctx.db.get(church.settings.defaultFundId);
    }
    if (!defaultFund) {
      defaultFund = await ctx.db
        .query("funds")
        .withIndex("by_type", (q) =>
          q.eq("churchId", args.churchId).eq("type", "general")
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
    }

    // Create import record first (but we'll set status to processing immediately)
    const importId = await ctx.db.insert("csvImports", {
      churchId: args.churchId,
      filename: args.filename,
      uploadedAt: Date.now(),
      bankFormat: args.bankFormat,
      mapping: args.mapping,
      status: "processing", // Go straight to processing, skip mapping status
      rowCount: args.rows.length,
      processedCount: 0,
      duplicateCount: 0,
    });

    // Save all rows with auto-detection
    let duplicateCount = 0;
    for (const row of args.rows) {
      // 1. Check for duplicates
      const duplicates = await findDuplicateTransactions(ctx, {
        churchId: args.churchId,
        date: row.date,
        amount: row.amount,
        reference: row.reference,
      });

      // 2. Auto-detect donor (only for income transactions)
      let donorMatch = null;
      let donorConfidence = 0;
      if (row.amount >= 0) {
        donorMatch = await matchDonor(
          ctx,
          args.churchId,
          row.description,
          row.reference
        );
        donorConfidence = donorMatch.confidence;
      }

      // 3. Auto-detect category using multi-tier detection (keyword → AI)
      const enableAI = church.settings.enableAiCategorization ?? true;
      const categoryResult = await detectCategoryWithAI(
        ctx,
        args.churchId,
        row.description,
        Math.abs(row.amount),
        enableAI
      );

      await ctx.db.insert("csvRows", {
        importId,
        raw: row,
        detectedFundId: defaultFund?._id,
        detectedDonorId: donorMatch?.donorId,
        donorConfidence: donorConfidence > 0 ? donorConfidence : undefined,
        detectedCategoryId: categoryResult.categoryId || undefined,
        categoryConfidence: categoryResult.confidence > 0 ? categoryResult.confidence : undefined,
        categorySource: categoryResult.source !== "none" ? categoryResult.source : undefined,
        duplicateOf: duplicates[0]?._id,
        status: duplicates.length > 0 ? "duplicate" : "pending",
      });

      if (duplicates.length > 0) {
        duplicateCount += 1;
      }
    }

    // Update duplicate count
    await ctx.db.patch(importId, {
      duplicateCount,
    });

    return importId;
  },
});


export const markRowReady = mutation({
  args: {
    rowId: v.id("csvRows"),
    fundId: v.id("funds"),
    categoryId: v.optional(v.id("categories")),
    donorId: v.optional(v.id("donors")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.rowId, {
      detectedFundId: args.fundId,
      detectedDonorId: args.donorId,
      status: "ready",
    });
  },
});

export const skipRow = mutation({
  args: { rowId: v.id("csvRows") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.rowId, { status: "skipped" });
  },
});

export const skipRows = mutation({
  args: { rowIds: v.array(v.id("csvRows")) },
  handler: async (ctx, args) => {
    for (const rowId of args.rowIds) {
      await ctx.db.patch(rowId, { status: "skipped" });
    }
  },
});

// Auto-approve rows with high confidence scores
export const autoApproveRows = mutation({
  args: {
    importId: v.id("csvImports"),
    churchId: v.id("churches"),
    minConfidence: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
    enteredByName: v.optional(v.string()),
  },
  returns: v.object({
    approvedCount: v.number(),
    skippedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) {
      throw new Error("Church not found");
    }

    const importRecord = await ctx.db.get(args.importId);
    if (!importRecord) {
      throw new Error("Import not found");
    }

    // Get auto-approve threshold (default 0.95)
    const threshold = args.minConfidence ?? church.settings.autoApproveThreshold ?? 0.95;

    // Get all pending rows from this import
    const rows = await ctx.db
      .query("csvRows")
      .withIndex("by_import", (q) => q.eq("importId", args.importId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    let approvedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      // Skip if missing required fields
      if (!row.detectedFundId) {
        skippedCount++;
        continue;
      }

      // Calculate overall confidence (average of available confidences)
      const confidences: number[] = [];
      if (row.donorConfidence !== undefined) {
        confidences.push(row.donorConfidence);
      }
      if (row.categoryConfidence !== undefined) {
        confidences.push(row.categoryConfidence);
      }

      // If we have no confidence scores, skip
      if (confidences.length === 0) {
        skippedCount++;
        continue;
      }

      const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

      // Auto-approve if confidence is high enough
      if (avgConfidence >= threshold) {
        const payload: CreateTransactionInput = {
          churchId: args.churchId,
          date: row.raw.date,
          description: row.raw.description,
          amount: Math.abs(row.raw.amount),
          type: row.raw.amount >= 0 ? "income" : "expense",
          fundId: row.detectedFundId,
          categoryId: row.detectedCategoryId,
          donorId: row.detectedDonorId,
          method: row.raw.type,
          reference: row.raw.reference,
          giftAid: false,
          notes: undefined,
          createdBy: args.createdBy,
          enteredByName: args.enteredByName,
          source: "csv",
          csvBatch: importRecord._id,
          receiptStorageId: undefined,
          receiptFilename: undefined,
        };

        await createTransactionInternal(ctx, payload);
        await ctx.db.patch(row._id, { status: "approved" });
        approvedCount++;
      } else {
        skippedCount++;
      }
    }

    // Update import record
    await ctx.db.patch(args.importId, {
      processedCount: importRecord.processedCount + approvedCount,
      status: (importRecord.processedCount + approvedCount) >= importRecord.rowCount
        ? "completed"
        : "processing",
    });

    return { approvedCount, skippedCount };
  },
});

export const approveRows = mutation({
  args: {
    importId: v.id("csvImports"),
    churchId: v.id("churches"),
    rows: v.array(
      v.object({
        rowId: v.id("csvRows"),
        fundId: v.id("funds"),
        categoryId: v.optional(v.id("categories")),
        donorId: v.optional(v.id("donors")),
      })
    ),
    createdBy: v.optional(v.id("users")),
    enteredByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const importRecord = await ctx.db.get(args.importId);
    if (!importRecord) {
      throw new Error("Import not found");
    }

    let processedCount = importRecord.processedCount;

    for (const rowSelection of args.rows) {
      const row = await ctx.db.get(rowSelection.rowId);
      if (!row) continue;
      if (row.status === "approved" || row.status === "skipped") continue;

      const payload: CreateTransactionInput = {
        churchId: args.churchId,
        date: row.raw.date,
        description: row.raw.description,
        amount: Math.abs(row.raw.amount),
        type: row.raw.amount >= 0 ? "income" : "expense",
        fundId: rowSelection.fundId,
        categoryId: rowSelection.categoryId,
        donorId: rowSelection.donorId,
        method: row.raw.type,
        reference: row.raw.reference,
        giftAid: false,
        notes: undefined,
        createdBy: args.createdBy,
        enteredByName: args.enteredByName,
        source: "csv",
        csvBatch: importRecord._id,
        receiptStorageId: undefined,
        receiptFilename: undefined,
      };

      await createTransactionInternal(ctx, payload);
      await ctx.db.patch(rowSelection.rowId, {
        status: "approved",
      });
      processedCount += 1;
    }

    await ctx.db.patch(args.importId, {
      processedCount,
      status: processedCount >= importRecord.rowCount ? "completed" : "processing",
    });
  },
});

export const listImports = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("csvImports")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .order("desc")
      .collect();
  },
});

export const getImportRows = query({
  args: { importId: v.id("csvImports") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("csvRows")
      .withIndex("by_import", (q) => q.eq("importId", args.importId))
      .collect();
  },
});

export const updateImportStatus = mutation({
  args: {
    importId: v.id("csvImports"),
    status: v.union(
      v.literal("uploaded"),
      v.literal("mapping"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.importId, { status: args.status });
  },
});

// Auto-cleanup cron job - runs every hour
export const cleanupStuckImports = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000; // 1 hour in milliseconds

    // Find all imports stuck in "mapping" status for over 1 hour
    const allImports = await ctx.db
      .query("csvImports")
      .withIndex("by_status", (q) => q.eq("status", "mapping"))
      .collect();

    const stuckImports = allImports.filter(
      (imp) => imp.uploadedAt < oneHourAgo && imp.processedCount === 0
    );

    let deletedCount = 0;
    for (const importRecord of stuckImports) {
      // Check if this import has any rows
      const rows = await ctx.db
        .query("csvRows")
        .withIndex("by_import", (q) => q.eq("importId", importRecord._id))
        .collect();

      // Delete all rows first
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }

      // Delete the import record
      await ctx.db.delete(importRecord._id);
      deletedCount++;
    }

    console.log(`[Cron] Cleaned up ${deletedCount} stuck imports older than 1 hour`);

    return {
      cleaned: deletedCount,
      timestamp: Date.now(),
    };
  },
});

