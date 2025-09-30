import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Churches/Organizations
  churches: defineTable({
    name: v.string(),
    charityNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    settings: v.object({
      fiscalYearEnd: v.string(),
      giftAidEnabled: v.boolean(),
      defaultCurrency: v.string(),
    }),
  }),

  // Funds
  funds: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    type: v.union(
      v.literal("general"),
      v.literal("restricted"),
      v.literal("designated")
    ),
    balance: v.number(),
    description: v.optional(v.string()),
    restrictions: v.optional(v.string()),
    isFundraising: v.boolean(),
    fundraisingTarget: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_church", ["churchId"])
    .index("by_type", ["churchId", "type"]),

  fundPledges: defineTable({
    churchId: v.id("churches"),
    fundId: v.id("funds"),
    donorId: v.id("donors"),
    amount: v.number(),
    pledgedAt: v.string(), // ISO date
    dueDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("fulfilled"),
      v.literal("cancelled")
    ),
  })
    .index("by_church", ["churchId"])
    .index("by_fund", ["fundId"])
    .index("by_donor", ["donorId"]),

  // Transactions
  transactions: defineTable({
    churchId: v.id("churches"),
    date: v.string(), // ISO date
    description: v.string(),
    amount: v.number(),
    type: v.union(v.literal("income"), v.literal("expense")),
    fundId: v.id("funds"),
    categoryId: v.optional(v.id("categories")),
    donorId: v.optional(v.id("donors")),
    method: v.optional(v.string()), // cash, cheque, transfer, etc
    reference: v.optional(v.string()),
    giftAid: v.boolean(),
    reconciled: v.boolean(),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    enteredByName: v.optional(v.string()),
    source: v.union(
      v.literal("manual"),
      v.literal("csv"),
      v.literal("api")
    ),
    csvBatch: v.optional(v.string()), // For tracking imports
    receiptStorageId: v.optional(v.id("_storage")),
    receiptFilename: v.optional(v.string()),
    pendingStatus: v.optional(
      v.union(
        v.literal("none"),
        v.literal("pending"),
        v.literal("cleared")
      )
    ),
    pendingReason: v.optional(v.string()),
    expectedClearDate: v.optional(v.string()),
    clearedAt: v.optional(v.number()),
  })
    .index("by_church_date", ["churchId", "date"])
    .index("by_fund", ["fundId"])
    .index("by_donor", ["donorId"])
    .index("by_reconciled", ["churchId", "reconciled"]),

  // CSV Imports
  csvImports: defineTable({
    churchId: v.id("churches"),
    filename: v.string(),
    uploadedAt: v.number(),
    bankFormat: v.union(
      v.literal("barclays"),
      v.literal("hsbc"),
      v.literal("metrobank"),
      v.literal("generic")
    ),
    status: v.union(
      v.literal("uploaded"),
      v.literal("mapping"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    rowCount: v.number(),
    processedCount: v.number(),
    duplicateCount: v.number(),
    mapping: v.object({
      date: v.string(),
      description: v.string(),
      amount: v.string(),
      amountIn: v.optional(v.string()),
      amountOut: v.optional(v.string()),
      reference: v.optional(v.string()),
      type: v.optional(v.string()),
    }),
  })
    .index("by_church", ["churchId", "uploadedAt"])
    .index("by_status", ["status"]),

  csvRows: defineTable({
    importId: v.id("csvImports"),
    raw: v.object({
      date: v.string(),
      description: v.string(),
      amount: v.number(),
      reference: v.optional(v.string()),
      type: v.optional(v.string()),
    }),
    detectedDonorId: v.optional(v.id("donors")),
    detectedFundId: v.optional(v.id("funds")),
    duplicateOf: v.optional(v.id("transactions")),
    status: v.union(
      v.literal("pending"),
      v.literal("duplicate"),
      v.literal("ready"),
      v.literal("approved"),
      v.literal("skipped")
    ),
  })
    .index("by_import", ["importId"])
    .index("by_duplicate", ["duplicateOf"]),

  // Reconciliation Sessions
  reconciliationSessions: defineTable({
    churchId: v.id("churches"),
    startedAt: v.number(),
    month: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in-progress"),
      v.literal("completed")
    ),
    bankBalance: v.number(),
    ledgerBalance: v.number(),
    pendingTotal: v.optional(v.number()),
    variance: v.optional(v.number()),
    adjustments: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    preparedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("by_church", ["churchId", "startedAt"]),

  reconciliationMatches: defineTable({
    sessionId: v.id("reconciliationSessions"),
    bankRowId: v.id("csvRows"),
    transactionId: v.id("transactions"),
    confidence: v.number(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_transaction", ["transactionId"]),

  // Report snapshots for iteration 8
  reportSnapshots: defineTable({
    churchId: v.id("churches"),
    type: v.union(
      v.literal("fund-balance"),
      v.literal("income-expense"),
      v.literal("donor-statements"),
      v.literal("reconciliation")
    ),
    generatedAt: v.number(),
    params: v.optional(v.any()),
    payload: v.any(),
  })
    .index("by_church_type", ["churchId", "type", "generatedAt"]),

  // Categories
  categories: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    parentId: v.optional(v.id("categories")),
    isSubcategory: v.boolean(), // true for subcategories, false for main categories
    isSystem: v.boolean(), // Pre-defined categories
  })
    .index("by_church", ["churchId"])
    .index("by_type", ["churchId", "type"])
    .index("by_subcategory", ["churchId", "isSubcategory"]),

  // Category Keywords (only linked to subcategories)
  categoryKeywords: defineTable({
    churchId: v.id("churches"),
    categoryId: v.id("categories"), // Links to subcategory only
    keyword: v.string(),
    isActive: v.boolean(),
  })
    .index("by_church", ["churchId"])
    .index("by_category", ["categoryId"])
    .index("by_keyword", ["churchId", "keyword"]),

  // Donors
  donors: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    giftAidDeclaration: v.optional(v.object({
      signed: v.boolean(),
      date: v.string(),
      expiryDate: v.optional(v.string()),
    })),
    bankReference: v.optional(v.string()), // For matching
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_church", ["churchId"])
    .index("by_email", ["churchId", "email"])
    .index("by_reference", ["churchId", "bankReference"]),

  // Users (from Convex Auth)
  users: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.optional(v.number()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerified: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    churchId: v.optional(v.id("churches")),
    role: v.union(
      v.literal("admin"),
      v.literal("treasurer"),
      v.literal("user")
    ),
  })
    .index("by_email", ["email"])
    .index("by_church", ["churchId"]),

  // Auth sessions and accounts (for Convex Auth)
  authSessions: defineTable({
    userId: v.id("users"),
    sessionToken: v.string(),
    expires: v.number(),
  })
    .index("by_session_token", ["sessionToken"])
    .index("by_user_id", ["userId"]),

  authAccounts: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("email"),
      v.literal("phone"),
      v.literal("oauth"),
      v.literal("oidc"),
      v.literal("webauthn")
    ),
    provider: v.string(),
    providerAccountId: v.string(),
    refresh_token: v.optional(v.string()),
    access_token: v.optional(v.string()),
    expires_at: v.optional(v.number()),
    token_type: v.optional(v.string()),
    scope: v.optional(v.string()),
    id_token: v.optional(v.string()),
    session_state: v.optional(v.string()),
    secret: v.optional(v.string()),
  })
    .index("by_provider_and_account_id", [
      "provider",
      "providerAccountId",
    ])
    .index("by_user_id", ["userId"]),

  authVerificationTokens: defineTable({
    identifier: v.string(),
    token: v.string(),
    expires: v.number(),
  })
    .index("by_identifier", ["identifier"])
    .index("by_token", ["token"]),

  // AI Cache
  aiCache: defineTable({
    key: v.string(), // hash of input
    value: v.string(), // AI response
    model: v.string(),
    expiresAt: v.number(), // Unix timestamp
    churchId: v.optional(v.id("churches")),
  })
    .index("by_key", ["key"])
    .index("by_expiry", ["expiresAt"]),

  aiFeedback: defineTable({
    churchId: v.id("churches"),
    inputHash: v.string(),
    description: v.string(),
    amount: v.number(),
    chosenCategoryId: v.id("categories"),
    confidence: v.number(),
    createdAt: v.number(),
    userId: v.optional(v.id("users")),
  })
    .index("by_church_input", ["churchId", "inputHash"])
    .index("by_church", ["churchId", "createdAt"]),

  aiUsage: defineTable({
    churchId: v.optional(v.id("churches")),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    cost: v.number(),
    createdAt: v.number(),
  })
    .index("by_church", ["churchId", "createdAt"]),

  pendingTransactions: defineTable({
    churchId: v.id("churches"),
    transactionId: v.id("transactions"),
    reason: v.string(),
    expectedClearDate: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_church_status", ["churchId", "resolvedAt"])
    .index("by_transaction", ["transactionId"]),

  // Audit Log
  auditLog: defineTable({
    churchId: v.id("churches"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    changes: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_church", ["churchId", "timestamp"])
    .index("by_user", ["userId", "timestamp"]),

  // AI Conversations
  aiConversations: defineTable({
    churchId: v.id("churches"),
    userId: v.id("users"),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        timestamp: v.number(),
        attachments: v.optional(v.array(v.id("_storage"))),
      })
    ),
    context: v.optional(
      v.object({
        page: v.optional(v.string()),
        fundId: v.optional(v.id("funds")),
        donorId: v.optional(v.id("donors")),
        transactionId: v.optional(v.id("transactions")),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_church_user", ["churchId", "userId", "updatedAt"]),

  // AI Insights
  aiInsights: defineTable({
    churchId: v.id("churches"),
    type: v.union(
      v.literal("anomaly"),
      v.literal("trend"),
      v.literal("compliance"),
      v.literal("prediction"),
      v.literal("recommendation")
    ),
    title: v.string(),
    description: v.string(),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical")
    ),
    actionable: v.boolean(),
    actionUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
    isRead: v.boolean(),
    isDismissed: v.boolean(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_church_unread", ["churchId", "isRead", "createdAt"])
    .index("by_church_active", ["churchId", "isDismissed", "createdAt"]),
});

