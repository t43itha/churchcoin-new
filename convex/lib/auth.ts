/**
 * Authentication and Authorization Middleware for Convex Functions
 *
 * This module provides a centralized auth layer that:
 * 1. Validates user identity via Clerk
 * 2. Resolves user's church membership
 * 3. Enforces role-based access control (RBAC)
 * 4. Provides type-safe church context to all operations
 *
 * Usage in queries/mutations:
 * ```typescript
 * import { getChurchContext, requireWritePermission, verifyFundOwnership } from "./lib/auth";
 *
 * export const createTransaction = mutation({
 *   args: { fundId: v.id("funds"), ... },
 *   handler: async (ctx, args) => {
 *     // Get church context (throws if not authenticated or no church)
 *     const church = await requireWritePermission(ctx);
 *
 *     // Verify fund belongs to user's church
 *     const fund = await verifyFundOwnership(ctx, args.fundId);
 *
 *     // Now safe to create transaction
 *     return ctx.db.insert("transactions", { ... });
 *   },
 * });
 * ```
 */

import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { normalizeRole, type CanonicalRole } from "../roles";
import { Errors } from "./errors";
import { canWrite, canAdmin, canPerform, type Operation } from "./permissions";

// Type for any context that has auth and db
type AuthContext = QueryCtx | MutationCtx;
type AnyContext = QueryCtx | MutationCtx | ActionCtx;

/**
 * Authenticated church context returned by auth middleware
 */
export interface ChurchContext {
  /** The authenticated user's ID */
  userId: Id<"users">;
  /** The user's church ID */
  churchId: Id<"churches">;
  /** The user's normalized role */
  role: CanonicalRole;
  /** Whether user can create/update data */
  canWrite: boolean;
  /** Whether user can delete data and manage settings */
  canAdmin: boolean;
  /** The full user document */
  user: Doc<"users">;
  /** The full church document */
  church: Doc<"churches">;
}

/**
 * Get Clerk identity from context
 * @throws AuthenticationError if not authenticated
 */
export async function requireIdentity(ctx: AnyContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    Errors.unauthorized("Authentication required");
  }
  return identity;
}

/**
 * Get the current authenticated user
 * @returns User document or null if not found
 */
export async function getCurrentUser(
  ctx: AuthContext
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    return null;
  }

  return ctx.db
    .query("users")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
    .first();
}

/**
 * Get the current authenticated user
 * @throws AuthenticationError if not authenticated or user not found
 */
export async function requireUser(ctx: AuthContext): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

/**
 * Get full church context for the authenticated user
 *
 * This is the primary auth middleware. Use this in most functions.
 *
 * @throws AuthenticationError if not authenticated
 * @throws AuthenticationError if user not found
 * @throws AuthorizationError if user not assigned to a church
 */
export async function getChurchContext(ctx: AuthContext): Promise<ChurchContext> {
  // 1. Get authenticated user
  const user = await requireUser(ctx);

  // 2. Verify user has church assignment
  if (!user.churchId) {
    throw new Error("User not assigned to a church");
  }

  // 3. Get church document
  const church = await ctx.db.get(user.churchId);
  if (!church) {
    throw new Error("Church not found");
  }

  // 4. Normalize role and compute permissions
  const role = normalizeRole(user.role);

  return {
    userId: user._id,
    churchId: user.churchId,
    role,
    canWrite: canWrite(role),
    canAdmin: canAdmin(role),
    user,
    church,
  };
}

/**
 * Get church context and require write permission (finance or admin role)
 *
 * Use this for mutations that create/update data.
 *
 * @throws AuthorizationError if user doesn't have write permission
 */
export async function requireWritePermission(
  ctx: AuthContext
): Promise<ChurchContext> {
  const churchContext = await getChurchContext(ctx);

  if (!churchContext.canWrite) {
    Errors.forbidden(
      "modify data. Finance or Administrator role required."
    );
  }

  return churchContext;
}

/**
 * Get church context and require admin permission
 *
 * Use this for mutations that delete data or manage settings.
 *
 * @throws AuthorizationError if user doesn't have admin permission
 */
export async function requireAdminPermission(
  ctx: AuthContext
): Promise<ChurchContext> {
  const churchContext = await getChurchContext(ctx);

  if (!churchContext.canAdmin) {
    Errors.forbidden(
      "perform administrative actions. Administrator role required."
    );
  }

  return churchContext;
}

/**
 * Require permission for a specific operation
 *
 * @example
 * const church = await requirePermission(ctx, "MANAGE_BANK_CONNECTIONS");
 */
export async function requirePermission(
  ctx: AuthContext,
  operation: Operation
): Promise<ChurchContext> {
  const churchContext = await getChurchContext(ctx);

  if (!canPerform(churchContext.role, operation)) {
    Errors.forbidden(
      `perform this operation. Insufficient permissions for ${operation}.`
    );
  }

  return churchContext;
}

// =============================================================================
// RESOURCE OWNERSHIP VERIFICATION
// =============================================================================

/**
 * Verify a resource belongs to the user's church
 *
 * @throws NotFoundError if resource doesn't exist
 * @throws AuthorizationError if resource doesn't belong to user's church
 */
export async function verifyChurchOwnership<
  T extends { churchId: Id<"churches"> }
>(
  ctx: AuthContext,
  resource: T | null,
  resourceType: string = "Resource"
): Promise<T> {
  if (!resource) {
    throw new Error(`${resourceType} not found`);
  }

  const churchContext = await getChurchContext(ctx);

  if (resource.churchId !== churchContext.churchId) {
    throw new Error(
      `Cannot access this ${resourceType}. It belongs to a different church.`
    );
  }

  return resource;
}

/**
 * Verify a fund belongs to the user's church
 *
 * @throws NotFoundError if fund doesn't exist
 * @throws AuthorizationError if fund doesn't belong to user's church
 */
export async function verifyFundOwnership(
  ctx: AuthContext,
  fundId: Id<"funds">
): Promise<Doc<"funds">> {
  const fund = await ctx.db.get(fundId);
  return verifyChurchOwnership(ctx, fund, "Fund");
}

/**
 * Verify a donor belongs to the user's church
 *
 * @throws NotFoundError if donor doesn't exist
 * @throws AuthorizationError if donor doesn't belong to user's church
 */
export async function verifyDonorOwnership(
  ctx: AuthContext,
  donorId: Id<"donors">
): Promise<Doc<"donors">> {
  const donor = await ctx.db.get(donorId);
  return verifyChurchOwnership(ctx, donor, "Donor");
}

/**
 * Verify a transaction belongs to the user's church
 *
 * @throws NotFoundError if transaction doesn't exist
 * @throws AuthorizationError if transaction doesn't belong to user's church
 */
export async function verifyTransactionOwnership(
  ctx: AuthContext,
  transactionId: Id<"transactions">
): Promise<Doc<"transactions">> {
  const transaction = await ctx.db.get(transactionId);
  return verifyChurchOwnership(ctx, transaction, "Transaction");
}

/**
 * Verify a category belongs to the user's church
 *
 * @throws NotFoundError if category doesn't exist
 * @throws AuthorizationError if category doesn't belong to user's church
 */
export async function verifyCategoryOwnership(
  ctx: AuthContext,
  categoryId: Id<"categories">
): Promise<Doc<"categories">> {
  const category = await ctx.db.get(categoryId);
  return verifyChurchOwnership(ctx, category, "Category");
}

/**
 * Verify a Plaid item belongs to the user's church
 *
 * @throws NotFoundError if Plaid item doesn't exist
 * @throws AuthorizationError if Plaid item doesn't belong to user's church
 */
export async function verifyPlaidItemOwnership(
  ctx: AuthContext,
  plaidItemId: Id<"plaidItems">
): Promise<Doc<"plaidItems">> {
  const plaidItem = await ctx.db.get(plaidItemId);
  return verifyChurchOwnership(ctx, plaidItem, "Bank Connection");
}

/**
 * Verify a CSV import belongs to the user's church
 *
 * @throws NotFoundError if import doesn't exist
 * @throws AuthorizationError if import doesn't belong to user's church
 */
export async function verifyImportOwnership(
  ctx: AuthContext,
  importId: Id<"csvImports">
): Promise<Doc<"csvImports">> {
  const csvImport = await ctx.db.get(importId);
  return verifyChurchOwnership(ctx, csvImport, "Import");
}

// =============================================================================
// CONVENIENCE HELPERS
// =============================================================================

/**
 * Get church ID from context, throwing if not available
 * Shorthand for when you just need the church ID
 */
export async function getChurchId(ctx: AuthContext): Promise<Id<"churches">> {
  const { churchId } = await getChurchContext(ctx);
  return churchId;
}

/**
 * Get user ID from context, throwing if not available
 * Shorthand for when you just need the user ID
 */
export async function getUserId(ctx: AuthContext): Promise<Id<"users">> {
  const { userId } = await getChurchContext(ctx);
  return userId;
}

/**
 * Check if the current user is an administrator
 */
export async function isAdmin(ctx: AuthContext): Promise<boolean> {
  try {
    const { canAdmin } = await getChurchContext(ctx);
    return canAdmin;
  } catch {
    return false;
  }
}

/**
 * Check if the current user can write data
 */
export async function isWriter(ctx: AuthContext): Promise<boolean> {
  try {
    const { canWrite } = await getChurchContext(ctx);
    return canWrite;
  } catch {
    return false;
  }
}

/**
 * Optionally get church context (returns null if not authenticated)
 * Useful for queries that have different behavior for authenticated vs unauthenticated users
 */
export async function getOptionalChurchContext(
  ctx: AuthContext
): Promise<ChurchContext | null> {
  try {
    return await getChurchContext(ctx);
  } catch {
    return null;
  }
}
