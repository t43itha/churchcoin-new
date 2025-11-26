// Onboarding workflow mutations and queries
// Handles both new church creation flow and invited user flow

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizeRole } from "./roles";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the current user's onboarding status
 * Used by AuthGuard to determine if user needs to complete onboarding
 */
export const getOnboardingStatus = query({
  args: {},
  returns: v.union(
    v.object({
      status: v.literal("pending"),
      hasInvite: v.boolean(),
    }),
    v.object({
      status: v.literal("in_progress"),
      flowType: v.union(v.literal("new-church"), v.literal("invited")),
    }),
    v.object({
      status: v.literal("completed"),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // If status is explicitly set, return it
    if (user.onboardingStatus === "completed") {
      return { status: "completed" as const };
    }

    if (user.onboardingStatus === "in_progress") {
      // Determine flow type based on whether user has a church
      const flowType = user.churchId ? "invited" : "new-church";
      return {
        status: "in_progress" as const,
        flowType: flowType as "new-church" | "invited",
      };
    }

    // For pending or undefined status, check if user has church
    // Existing users with churchId but no status are considered complete
    if (user.churchId && !user.onboardingStatus) {
      return { status: "completed" as const };
    }

    // Check if user has a pending invite
    const hasInvite = user.churchId !== undefined && user.churchId !== null;

    return {
      status: "pending" as const,
      hasInvite,
    };
  },
});

/**
 * Validate an invitation token and return church details
 * Used to show church name on invited user flow
 */
export const validateInviteToken = query({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.object({
      valid: v.literal(true),
      churchId: v.id("churches"),
      churchName: v.string(),
      role: v.string(),
      email: v.string(),
    }),
    v.object({
      valid: v.literal(false),
      reason: v.union(
        v.literal("not_found"),
        v.literal("expired"),
        v.literal("already_used"),
        v.literal("revoked")
      ),
    })
  ),
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("userInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return { valid: false as const, reason: "not_found" as const };
    }

    if (invitation.revokedAt) {
      return { valid: false as const, reason: "revoked" as const };
    }

    if (invitation.acceptedAt) {
      return { valid: false as const, reason: "already_used" as const };
    }

    if (invitation.expiresAt <= Date.now()) {
      return { valid: false as const, reason: "expired" as const };
    }

    const church = await ctx.db.get(invitation.churchId);

    return {
      valid: true as const,
      churchId: invitation.churchId,
      churchName: church?.name ?? "Unknown Church",
      role: normalizeRole(invitation.role),
      email: invitation.email,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Start the onboarding process
 * Sets status to in_progress and validates invite if provided
 */
export const startOnboarding = mutation({
  args: {
    flowType: v.union(v.literal("new-church"), v.literal("invited")),
    inviteToken: v.optional(v.string()),
  },
  returns: v.object({
    flowType: v.union(v.literal("new-church"), v.literal("invited")),
    churchName: v.optional(v.string()),
    role: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Update onboarding status to in_progress
    await ctx.db.patch(user._id, {
      onboardingStatus: "in_progress",
    });

    // For invited flow, validate and return church info
    if (args.flowType === "invited" && args.inviteToken) {
      const invitation = await ctx.db
        .query("userInvites")
        .withIndex("by_token", (q) => q.eq("token", args.inviteToken!))
        .first();

      if (invitation && !invitation.revokedAt && !invitation.acceptedAt && invitation.expiresAt > Date.now()) {
        const church = await ctx.db.get(invitation.churchId);
        return {
          flowType: "invited" as const,
          churchName: church?.name,
          role: normalizeRole(invitation.role),
        };
      }
    }

    return {
      flowType: args.flowType,
      churchName: undefined,
      role: undefined,
    };
  },
});

/**
 * Create a new church during onboarding
 * Creates church with default funds and categories, links user to it
 */
export const createChurchWithOnboarding = mutation({
  args: {
    name: v.string(),
    charityNumber: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  returns: v.id("churches"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Create the church with default settings
    const churchId = await ctx.db.insert("churches", {
      name: args.name.trim(),
      charityNumber: args.charityNumber?.trim() || undefined,
      address: args.address?.trim() || undefined,
      settings: {
        fiscalYearEnd: "03-31",
        giftAidEnabled: false,
        defaultCurrency: "GBP",
        importsAllowAi: true,
      },
    });

    // Create default funds
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

    // Link user to the church
    await ctx.db.patch(user._id, {
      churchId,
      role: "administrator", // First user is always admin
    });

    return churchId;
  },
});

/**
 * Update church details during onboarding
 * For when user wants to add charity number, address, etc.
 */
export const updateChurchDuringOnboarding = mutation({
  args: {
    churchId: v.id("churches"),
    charityNumber: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user || user.churchId !== args.churchId) {
      throw new ConvexError("Not authorized to update this church");
    }

    const updates: { charityNumber?: string; address?: string } = {};

    if (args.charityNumber !== undefined) {
      updates.charityNumber = args.charityNumber.trim() || undefined;
    }

    if (args.address !== undefined) {
      updates.address = args.address.trim() || undefined;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.churchId, updates);
    }

    return null;
  },
});

/**
 * Complete the onboarding process
 * Marks user as having completed onboarding
 */
export const completeOnboarding = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Ensure user has a church before completing
    if (!user.churchId) {
      throw new ConvexError("Cannot complete onboarding without a church");
    }

    await ctx.db.patch(user._id, {
      onboardingStatus: "completed",
      onboardingCompletedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// MIGRATION
// ============================================================================

/**
 * Backfill onboarding status for existing users
 * Run this once after deploying schema changes
 */
export const backfillOnboardingStatus = mutation({
  args: {},
  returns: v.object({
    updated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      // Skip users who already have an onboarding status
      if (user.onboardingStatus) {
        skipped++;
        continue;
      }

      // Users with a church are considered to have completed onboarding
      if (user.churchId) {
        await ctx.db.patch(user._id, {
          onboardingStatus: "completed",
          onboardingCompletedAt: Date.now(),
        });
        updated++;
      } else {
        // Users without a church need to complete onboarding
        await ctx.db.patch(user._id, {
          onboardingStatus: "pending",
        });
        updated++;
      }
    }

    return { updated, skipped };
  },
});
