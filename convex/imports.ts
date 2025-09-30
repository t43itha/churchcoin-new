import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  createTransactionInternal,
  findDuplicateTransactions,
  type CreateTransactionInput,
} from "./transactions";

// Category detection function for subcategories only
async function detectSubcategory(
  ctx: MutationCtx,
  churchId: Id<"churches">,
  description: string
): Promise<Id<"categories"> | null> {
  if (!description || description.trim().length === 0) {
    return null;
  }

  // Get all active keywords for subcategories in this church
  const keywords = await ctx.db
    .query("categoryKeywords")
    .withIndex("by_church", (q) => q.eq("churchId", churchId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  if (keywords.length === 0) {
    return null;
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
    return null;
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
    return matches[0].categoryId as Id<"categories">;
  }

  return null;
}

export const createCsvImport = mutation({
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
    rowCount: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("csvImports", {
      churchId: args.churchId,
      filename: args.filename,
      uploadedAt: Date.now(),
      bankFormat: args.bankFormat,
      mapping: args.mapping,
      status: "mapping",
      rowCount: args.rowCount,
      processedCount: 0,
      duplicateCount: 0,
    });
  },
});

export const saveCsvRows = mutation({
  args: {
    importId: v.id("csvImports"),
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
    const importRecord = await ctx.db.get(args.importId);
    if (!importRecord) {
      throw new Error("Import not found");
    }

    let duplicateCount = 0;
    for (const row of args.rows) {
      const duplicates = await findDuplicateTransactions(ctx, {
        churchId: importRecord.churchId,
        date: row.date,
        amount: row.amount,
        reference: row.reference,
      });

      await ctx.db.insert("csvRows", {
        importId: args.importId,
        raw: row,
        detectedDonorId: undefined,
        detectedFundId: undefined,
        duplicateOf: duplicates[0]?._id,
        status: duplicates.length > 0 ? "duplicate" : "pending",
      });

      if (duplicates.length > 0) {
        duplicateCount += 1;
      }
    }

    await ctx.db.patch(args.importId, {
      duplicateCount,
      status: "processing",
    });
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
