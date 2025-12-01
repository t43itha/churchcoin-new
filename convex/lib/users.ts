/**
 * User resolution utilities
 *
 * Centralizes user lookup logic previously duplicated in:
 * - transactions.ts (3x)
 * - plaidInternal.ts
 *
 * Usage:
 * ```typescript
 * import { resolveUser, resolveUsers, getPlaceholderUser } from "./lib/users";
 *
 * const user = await resolveUser(ctx, userId);
 * const userMap = await resolveUsers(ctx, userIds);
 * ```
 */

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Resolved user info for display
 */
export interface ResolvedUser {
  _id: Id<"users">;
  name: string;
  email: string;
  role: string;
  image?: string;
}

/**
 * User lookup map for batch resolution
 */
export type UserLookupMap = Map<Id<"users">, ResolvedUser>;

// =============================================================================
// SINGLE USER RESOLUTION
// =============================================================================

/**
 * Resolve a user ID to user info for display
 *
 * @returns User info or null if not found
 */
export async function resolveUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users"> | undefined | null
): Promise<ResolvedUser | null> {
  if (!userId) return null;

  const user = await ctx.db.get(userId);
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name || "Unknown User",
    email: user.email || "",
    role: user.role || "secured_guest",
    image: user.image,
  };
}

/**
 * Get user by Clerk user ID
 */
export async function getUserByClerkId(
  ctx: QueryCtx | MutationCtx,
  clerkUserId: string
): Promise<Doc<"users"> | null> {
  return ctx.db
    .query("users")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
    .first();
}

/**
 * Get user by email
 */
export async function getUserByEmail(
  ctx: QueryCtx | MutationCtx,
  email: string
): Promise<Doc<"users"> | null> {
  const normalizedEmail = email.trim().toLowerCase();
  return ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .first();
}

// =============================================================================
// BATCH USER RESOLUTION
// =============================================================================

/**
 * Resolve multiple user IDs efficiently (single batch query)
 *
 * Use this when you need to display user info for multiple records
 * to avoid N+1 query problems.
 *
 * @example
 * ```typescript
 * const userIds = transactions.map(tx => tx.createdBy).filter(Boolean);
 * const userMap = await resolveUsers(ctx, userIds);
 *
 * transactions.map(tx => ({
 *   ...tx,
 *   createdByUser: tx.createdBy ? userMap.get(tx.createdBy) : null,
 * }));
 * ```
 */
export async function resolveUsers(
  ctx: QueryCtx | MutationCtx,
  userIds: (Id<"users"> | undefined | null)[]
): Promise<UserLookupMap> {
  // Deduplicate and filter out nulls
  const uniqueIds = [
    ...new Set(userIds.filter((id): id is Id<"users"> => id != null)),
  ];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  // Batch fetch all users
  const users = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));

  // Build lookup map
  const userMap: UserLookupMap = new Map();

  users.forEach((user, index) => {
    if (user) {
      userMap.set(uniqueIds[index], {
        _id: user._id,
        name: user.name || "Unknown User",
        email: user.email || "",
        role: user.role || "secured_guest",
        image: user.image,
      });
    }
  });

  return userMap;
}

// =============================================================================
// PLACEHOLDER USER HANDLING
// =============================================================================

/**
 * Get or create a placeholder user for a church
 *
 * Used when importing transactions that need a createdBy user but
 * we don't have the actual user (e.g., historical imports, system actions).
 */
export async function getOrCreatePlaceholderUser(
  ctx: MutationCtx,
  churchId: Id<"churches">
): Promise<Id<"users">> {
  const placeholderEmail = `system@church-${churchId}.internal`;

  // Check if placeholder exists
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", placeholderEmail))
    .first();

  if (existing) {
    return existing._id;
  }

  // Create placeholder user
  const userId = await ctx.db.insert("users", {
    name: "System",
    email: placeholderEmail,
    role: "secured_guest",
    churchId,
    onboardingStatus: "completed",
  });

  return userId;
}

/**
 * Check if a user is a placeholder/system user
 */
export function isPlaceholderUser(user: Doc<"users">): boolean {
  return user.email.endsWith(".internal");
}

// =============================================================================
// USER LOOKUP HELPERS
// =============================================================================

/**
 * Get all users for a church
 */
export async function getChurchUsers(
  ctx: QueryCtx | MutationCtx,
  churchId: Id<"churches">
): Promise<Doc<"users">[]> {
  return ctx.db
    .query("users")
    .withIndex("by_church", (q) => q.eq("churchId", churchId))
    .collect();
}

/**
 * Get users with a specific role in a church
 */
export async function getChurchUsersByRole(
  ctx: QueryCtx | MutationCtx,
  churchId: Id<"churches">,
  role: string
): Promise<Doc<"users">[]> {
  const users = await getChurchUsers(ctx, churchId);
  return users.filter((user) => user.role === role);
}

/**
 * Count users in a church
 */
export async function countChurchUsers(
  ctx: QueryCtx | MutationCtx,
  churchId: Id<"churches">
): Promise<number> {
  const users = await ctx.db
    .query("users")
    .withIndex("by_church", (q) => q.eq("churchId", churchId))
    .collect();
  return users.length;
}

// =============================================================================
// USER DISPLAY HELPERS
// =============================================================================

/**
 * Get display name for a user
 */
export function getUserDisplayName(
  user: Doc<"users"> | ResolvedUser | null
): string {
  if (!user) return "Unknown";
  return user.name || user.email || "Unknown User";
}

/**
 * Get initials for avatar display
 */
export function getUserInitials(
  user: Doc<"users"> | ResolvedUser | null
): string {
  if (!user) return "?";

  const name = user.name || user.email || "";
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase() || "?";
}
