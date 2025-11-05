import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const requireActiveSession = async (
  ctx: AnyCtx,
) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    throw new ConvexError("Unauthorised");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
    .first();

  if (!user) {
    throw new ConvexError("Unauthorised");
  }

  return { user: user as Doc<"users"> };
};

const assertReceiptOwnership = async (
  ctx: AnyCtx,
  storageId: Id<"_storage">,
  churchId: Id<"churches">
) => {
  const transaction = await ctx.db
    .query("transactions")
    .withIndex("by_receipt_storage_id", (q) => q.eq("receiptStorageId", storageId))
    .first();

  if (!transaction || transaction.churchId !== churchId) {
    throw new ConvexError("Receipt not found");
  }

  return transaction;
};

export const generateReceiptUploadUrl = mutation({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const { user } = await requireActiveSession(ctx);

    if (user.churchId !== args.churchId) {
      throw new ConvexError("Forbidden");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const getReceiptUrl = query({
  args: {
    churchId: v.id("churches"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireActiveSession(ctx);

    if (user.churchId !== args.churchId) {
      throw new ConvexError("Forbidden");
    }

    await assertReceiptOwnership(ctx, args.storageId, args.churchId);

    return await ctx.storage.getUrl(args.storageId);
  },
});

export const deleteReceipt = mutation({
  args: {
    churchId: v.id("churches"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireActiveSession(ctx);

    if (user.churchId !== args.churchId) {
      throw new ConvexError("Forbidden");
    }

    await assertReceiptOwnership(ctx, args.storageId, args.churchId);

    await ctx.storage.delete(args.storageId);
  },
});
