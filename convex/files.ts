import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const requireActiveSession = async (
  ctx: AnyCtx,
  sessionToken: string
) => {
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
    .first();

  if (!session || session.expires < Date.now()) {
    throw new ConvexError("Unauthorised");
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    throw new ConvexError("Unauthorised");
  }

  return { session, user };
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
  args: { sessionToken: v.string(), churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const { user } = await requireActiveSession(ctx, args.sessionToken);

    if (user.churchId !== args.churchId) {
      throw new ConvexError("Forbidden");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const getReceiptUrl = query({
  args: {
    sessionToken: v.string(),
    churchId: v.id("churches"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireActiveSession(ctx, args.sessionToken);

    if (user.churchId !== args.churchId) {
      throw new ConvexError("Forbidden");
    }

    await assertReceiptOwnership(ctx, args.storageId, args.churchId);

    return await ctx.storage.getUrl(args.storageId);
  },
});

export const deleteReceipt = mutation({
  args: {
    sessionToken: v.string(),
    churchId: v.id("churches"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireActiveSession(ctx, args.sessionToken);

    if (user.churchId !== args.churchId) {
      throw new ConvexError("Forbidden");
    }

    await assertReceiptOwnership(ctx, args.storageId, args.churchId);

    await ctx.storage.delete(args.storageId);
  },
});
