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
    isActive: v.boolean(),
  })
    .index("by_church", ["churchId"])
    .index("by_type", ["churchId", "type"]),

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
    source: v.union(
      v.literal("manual"),
      v.literal("csv"),
      v.literal("api")
    ),
    csvBatch: v.optional(v.string()), // For tracking imports
  })
    .index("by_church_date", ["churchId", "date"])
    .index("by_fund", ["fundId"])
    .index("by_donor", ["donorId"])
    .index("by_reconciled", ["churchId", "reconciled"]),

  // Categories
  categories: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    parentId: v.optional(v.id("categories")),
    isSystem: v.boolean(), // Pre-defined categories
  })
    .index("by_church", ["churchId"])
    .index("by_type", ["churchId", "type"]),

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
  })
    .index("by_key", ["key"])
    .index("by_expiry", ["expiresAt"]),

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
});