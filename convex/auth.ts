// Clerk-based authentication with Convex user sync and invitation system

import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { normalizeRole, type CanonicalRole } from "./roles";
import type { Doc, Id } from "./_generated/dataModel";

const INVITE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const normaliseEmail = (email: string) => email.trim().toLowerCase();

// Generate random string for invitation tokens
const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateInviteToken = () => generateRandomString(32);

const invitesTable = "userInvites" as const;

type AnyCtx = MutationCtx | QueryCtx;

const isActiveInviteForEmail = (invitation: Doc<"userInvites">, email: string) => {
  if (!invitation) {
    return false;
  }

  if (invitation.revokedAt || invitation.acceptedAt) {
    return false;
  }

  if (invitation.expiresAt <= Date.now()) {
    return false;
  }

  return normaliseEmail(invitation.email) === email;
};

const findInvitationForEmail = async (
  ctx: AnyCtx,
  email: string,
  token?: string | null
) => {
  const normalizedEmail = normaliseEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  if (token) {
    const inviteByToken = await ctx.db
      .query(invitesTable)
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (inviteByToken && isActiveInviteForEmail(inviteByToken, normalizedEmail)) {
      return inviteByToken;
    }
  }

  const invitations = await ctx.db
    .query(invitesTable)
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .collect();

  return (
    invitations
      .filter((invite) => isActiveInviteForEmail(invite, normalizedEmail))
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  );
};

// ============================================================================
// CLERK USER SYNC
// ============================================================================

export const ensureUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    inviteToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || identity.subject !== args.clerkUserId) {
      throw new ConvexError("Unauthorised");
    }

    const email = normaliseEmail(
      args.email ?? identity.email ?? ""
    );

    if (!email) {
      throw new ConvexError("An email address is required to establish a user session");
    }

    const displayName = (args.name ?? identity.name ?? email).trim();
    const imageUrl = args.imageUrl ?? identity.pictureUrl ?? undefined;

    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    const now = Date.now();
    let invitation: Doc<"userInvites"> | null = null;

    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user) {
      invitation = await findInvitationForEmail(ctx, email, args.inviteToken ?? null);

      // For invited users: use the church from invitation
      // For new users without invitation: churchId is undefined, they'll go through onboarding
      const churchId = invitation?.churchId ?? undefined;
      const role: CanonicalRole = invitation ? normalizeRole(invitation.role) : "administrator";

      // Determine onboarding status:
      // - With invitation: "pending" (will see welcome wizard)
      // - Without invitation: "pending" (will create new church via wizard)
      const onboardingStatus = "pending" as const;

      const userId = await ctx.db.insert("users", {
        name: displayName,
        email,
        role,
        churchId,
        clerkUserId: args.clerkUserId,
        image: imageUrl,
        onboardingStatus,
      });

      user = await ctx.db.get(userId);

      if (invitation) {
        await ctx.db.patch(invitation._id, {
          acceptedAt: now,
          acceptedBy: userId,
        });
      }
    } else {
      const updates: Partial<Doc<"users">> = {};

      if (!user.clerkUserId) {
        updates.clerkUserId = args.clerkUserId;
      }

      if (displayName && displayName !== user.name) {
        updates.name = displayName;
      }

      if (email && email !== normaliseEmail(user.email)) {
        updates.email = email;
      }

      if (imageUrl && imageUrl !== user.image) {
        updates.image = imageUrl;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
        user = await ctx.db.get(user._id);
      }

      invitation = await findInvitationForEmail(ctx, email, args.inviteToken ?? null);

      if (invitation && user) {
        const normalizedRole = normalizeRole(invitation.role);
        const requiresUpdate =
          user.churchId !== invitation.churchId || user.role !== normalizedRole;

        if (requiresUpdate) {
          await ctx.db.patch(user._id, {
            churchId: invitation.churchId,
            role: normalizedRole,
          });
          const updatedUser = await ctx.db.get(user._id);
          if (!updatedUser) {
            throw new ConvexError("Failed to update user");
          }
          user = updatedUser;
        }

        // At this point, user is guaranteed to be non-null
        if (!invitation.acceptedAt || invitation.acceptedBy !== user._id) {
          await ctx.db.patch(invitation._id, {
            acceptedAt: now,
            acceptedBy: user._id,
          });
        }
      }
    }

    if (!user) {
      throw new ConvexError("Unable to resolve user identity");
    }

    return {
      ...user,
      role: normalizeRole(user.role),
    };
  },
});

export const getCurrentUser = query({
  args: {},
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

    return {
      ...user,
      role: normalizeRole(user.role),
    };
  },
});

// ============================================================================
// USER INVITATION SYSTEM
// ============================================================================

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
        role: normalizeRole(args.role),
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
      role: normalizeRole(args.role),
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
      role: normalizeRole(invite.role),
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
      role: normalizeRole(invitation.role),
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
