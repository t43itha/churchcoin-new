import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const INVITE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const normaliseEmail = (email: string) => email.trim().toLowerCase();

const generateInviteToken = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const invitesTable = "userInvites" as const;

export const createInvitation = mutation({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("administrator"),
      v.literal("finance"),
      v.literal("pastorate"),
      v.literal("secured_guest")
    ),
    churchId: v.id("churches"),
    invitedBy: v.id("users"),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = normaliseEmail(args.email);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser && existingUser.churchId === args.churchId) {
      throw new ConvexError(
        "A user with this email already belongs to this church."
      );
    }

    const now = Date.now();
    const expiresAt = args.expiresAt ?? now + INVITE_EXPIRY_MS;
    const token = generateInviteToken();

    const invitations = await ctx.db
      .query(invitesTable)
      .withIndex("by_email_church", (q) =>
        q.eq("email", email).eq("churchId", args.churchId)
      )
      .collect();

    const activeInvite = invitations.find(
      (invite) =>
        !invite.acceptedAt &&
        !invite.revokedAt &&
        invite.expiresAt > now
    );

    if (activeInvite) {
      await ctx.db.patch(activeInvite._id, {
        token,
        invitedBy: args.invitedBy,
        createdAt: now,
        expiresAt,
      });

      return {
        invitationId: activeInvite._id,
        token,
        expiresAt,
      };
    }

    const invitationId = await ctx.db.insert(invitesTable, {
      email,
      churchId: args.churchId,
      role: args.role,
      token,
      invitedBy: args.invitedBy,
      createdAt: now,
      expiresAt,
      acceptedAt: undefined,
      acceptedBy: undefined,
      revokedAt: undefined,
    });

    return { invitationId, token, expiresAt };
  },
});

export const listInvitations = query({
  args: {
    churchId: v.id("churches"),
  },
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query(invitesTable)
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    const inviterIds = Array.from(
      new Set(invites.map((invite) => invite.invitedBy))
    );

    const inviters = await Promise.all(
      inviterIds.map((userId) => ctx.db.get(userId))
    );

    const invitersMap = new Map(
      inviters
        .filter((user): user is NonNullable<typeof user> => Boolean(user))
        .map((user) => [user._id, user])
    );

    return invites.map((invite) => ({
      ...invite,
      invitedByUser: invitersMap.get(invite.invitedBy) ?? null,
    }));
  },
});

export const getInvitationByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query(invitesTable)
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    if (invitation.revokedAt || invitation.acceptedAt) {
      return null;
    }

    if (invitation.expiresAt <= Date.now()) {
      return null;
    }

    const church = await ctx.db.get(invitation.churchId as Id<"churches">);

    return {
      ...invitation,
      churchName: church?.name ?? null,
    };
  },
});

export const revokeInvitation = mutation({
  args: {
    invitationId: v.id("userInvites"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new ConvexError("Invitation not found");
    }

    if (invitation.acceptedAt) {
      throw new ConvexError("This invitation has already been accepted");
    }

    if (invitation.revokedAt) {
      return;
    }

    await ctx.db.patch(args.invitationId, {
      revokedAt: Date.now(),
    });
  },
});
