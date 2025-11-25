import { v } from "convex/values";

/**
 * Shared validators for consistent type definitions across Convex functions.
 * Reduces duplication and ensures schema consistency.
 */

// Fund type union
export const fundTypeValidator = v.union(
  v.literal("general"),
  v.literal("restricted"),
  v.literal("designated")
);

// Transaction type union
export const transactionTypeValidator = v.union(
  v.literal("income"),
  v.literal("expense")
);

// Transaction source
export const transactionSourceValidator = v.union(
  v.literal("manual"),
  v.literal("csv"),
  v.literal("api")
);

// Pending status validators
export const pendingStatusValidator = v.union(
  v.literal("none"),
  v.literal("pending"),
  v.literal("cleared")
);

// Import status validators
export const importStatusValidator = v.union(
  v.literal("uploaded"),
  v.literal("mapping"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

// CSV row status validators
export const csvRowStatusValidator = v.union(
  v.literal("pending"),
  v.literal("duplicate"),
  v.literal("ready"),
  v.literal("approved"),
  v.literal("skipped")
);

// Financial period status
export const periodStatusValidator = v.union(
  v.literal("draft"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("overdue")
);

// Pledge status
export const pledgeStatusValidator = v.union(
  v.literal("open"),
  v.literal("fulfilled"),
  v.literal("cancelled")
);

// Reconciliation session status
export const reconciliationStatusValidator = v.union(
  v.literal("open"),
  v.literal("in-progress"),
  v.literal("completed")
);

// Report type
export const reportTypeValidator = v.union(
  v.literal("fund-balance"),
  v.literal("income-expense"),
  v.literal("donor-statements"),
  v.literal("reconciliation")
);

// Bank format for imports
export const bankFormatValidator = v.union(
  v.literal("barclays"),
  v.literal("hsbc"),
  v.literal("metrobank"),
  v.literal("generic")
);

// AI insight types
export const insightTypeValidator = v.union(
  v.literal("anomaly"),
  v.literal("trend"),
  v.literal("compliance"),
  v.literal("prediction"),
  v.literal("recommendation")
);

// AI insight severity
export const insightSeverityValidator = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("critical")
);

// Category type
export const categoryTypeValidator = v.union(
  v.literal("income"),
  v.literal("expense")
);

// Message role for AI conversations
export const messageRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant")
);

// Pagination options validator
export const paginationValidator = v.object({
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
});

// Common return validators for funds
export const fundValidator = v.object({
  _id: v.id("funds"),
  _creationTime: v.number(),
  churchId: v.id("churches"),
  name: v.string(),
  type: fundTypeValidator,
  balance: v.number(),
  description: v.optional(v.string()),
  restrictions: v.optional(v.string()),
  isFundraising: v.boolean(),
  fundraisingTarget: v.optional(v.number()),
  isActive: v.boolean(),
});

// Fund summary for listings (lighter than full fund)
export const fundSummaryValidator = v.object({
  _id: v.id("funds"),
  name: v.string(),
  type: fundTypeValidator,
  balance: v.number(),
  isActive: v.boolean(),
});

// Transaction validator
export const transactionValidator = v.object({
  _id: v.id("transactions"),
  _creationTime: v.number(),
  churchId: v.id("churches"),
  date: v.string(),
  description: v.string(),
  amount: v.number(),
  type: transactionTypeValidator,
  fundId: v.id("funds"),
  categoryId: v.optional(v.id("categories")),
  donorId: v.optional(v.id("donors")),
  method: v.optional(v.string()),
  reference: v.optional(v.string()),
  giftAid: v.boolean(),
  reconciled: v.boolean(),
  notes: v.optional(v.string()),
  createdBy: v.id("users"),
  enteredByName: v.optional(v.string()),
  source: transactionSourceValidator,
  csvBatch: v.optional(v.string()),
  receiptStorageId: v.optional(v.id("_storage")),
  receiptFilename: v.optional(v.string()),
  pendingStatus: v.optional(pendingStatusValidator),
  pendingReason: v.optional(v.string()),
  expectedClearDate: v.optional(v.string()),
  clearedAt: v.optional(v.number()),
  periodMonth: v.optional(v.number()),
  periodYear: v.optional(v.number()),
  weekEnding: v.optional(v.string()),
  needsReview: v.optional(v.boolean()),
  reviewedAt: v.optional(v.number()),
});

// Donor validator
export const donorValidator = v.object({
  _id: v.id("donors"),
  _creationTime: v.number(),
  churchId: v.id("churches"),
  name: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  giftAidDeclaration: v.optional(
    v.object({
      signed: v.boolean(),
      date: v.string(),
      expiryDate: v.optional(v.string()),
    })
  ),
  bankReference: v.optional(v.string()),
  isActive: v.boolean(),
  notes: v.optional(v.string()),
});

// Category validator
export const categoryValidator = v.object({
  _id: v.id("categories"),
  _creationTime: v.number(),
  churchId: v.id("churches"),
  name: v.string(),
  type: categoryTypeValidator,
  parentId: v.optional(v.id("categories")),
  isSubcategory: v.boolean(),
  isSystem: v.boolean(),
});

// AI message validator for conversations
export const aiMessageValidator = v.object({
  role: messageRoleValidator,
  content: v.string(),
  timestamp: v.number(),
  attachments: v.optional(v.array(v.id("_storage"))),
});
