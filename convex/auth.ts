import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { normalizeRole, type CanonicalRole } from "./roles";
import type { Doc, Id } from "./_generated/dataModel";

const INVITE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const TOKEN_BYTE_LENGTH = 32;

const normaliseEmail = (email: string) => email.trim().toLowerCase();

const generateRandomString = (length: number): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateSecureToken = () => generateRandomString(TOKEN_BYTE_LENGTH);

const invitesTable = "userInvites" as const;

type EnsureUserArgs = {
  clerkUserId: string;
  email: string;
  name?: string;
};

function buildDefaultChurchName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "New Church Workspace";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const base = parts[0] ?? "New";
  return `${base}'s Church`;
}

async function findActiveInvitation(
  ctx: MutationCtx,
  email: string,
  now: number
) {
  const invitations = await ctx.db
    .query(invitesTable)
    .withIndex("by_email_church", (q) => q.eq("email", email))
    .collect();

  return (
    invitations.find(
      (invite) =>
        !invite.acceptedAt &&
        !invite.revokedAt &&
        invite.expiresAt > now
    ) ?? null
  );
}

async function resolveChurchId(ctx: MutationCtx, name: string): Promise<Id<"churches">> {
  const existingChurch = await ctx.db.query("churches").first();
  if (existingChurch) {
    return existingChurch._id;
  }

  const churchId = await ctx.db.insert("churches", {
    name: buildDefaultChurchName(name),
    charityNumber: undefined,
    address: undefined,
    settings: {
      fiscalYearEnd: "03-31",
      giftAidEnabled: false,
      defaultCurrency: "GBP",
      defaultFundId: undefined,
      autoApproveThreshold: undefined,
      enableAiCategorization: undefined,
      importsAllowAi: undefined,
      aiApiKey: undefined,
    },
  });

  return churchId;
}

export const ensureUserProfile = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args: EnsureUserArgs) => {
    const email = normaliseEmail(args.email);
    const displayName = args.name?.trim() || email;

    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (user) {
      const updates: Partial<Doc<"users">> = {};

      if (user.clerkUserId !== args.clerkUserId) {
        updates.clerkUserId = args.clerkUserId;
      }

      if (displayName && user.name !== displayName) {
        updates.name = displayName;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
        user = { ...user, ...updates } as Doc<"users">;
      }

      return { ...user, role: normalizeRole(user.role) };
    }

    const now = Date.now();
    const invitation = await findActiveInvitation(ctx, email, now);

    let role: CanonicalRole = "administrator";
    let churchId: Id<"churches">;

    if (invitation) {
      role = normalizeRole(invitation.role);
      churchId = invitation.churchId;
    } else {
      churchId = await resolveChurchId(ctx, displayName);
    }

    const userId = await ctx.db.insert("users", {
      name: displayName,
      email,
      role,
      churchId,
      clerkUserId: args.clerkUserId,
    });

    if (invitation) {
      await ctx.db.patch(invitation._id, {
        acceptedAt: now,
        acceptedBy: userId,
      });
    }

    const userDoc = await ctx.db.get(userId);
    if (!userDoc) {
      throw new ConvexError("Unable to load newly created user");
    }

    return { ...userDoc, role: normalizeRole(userDoc.role) };
  },
});

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
    const token = generateSecureToken();

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

    const inviterIds = Array.from(new Set(invites.map((invite) => invite.invitedBy)));

    const inviters = await Promise.all(
      inviterIds.map((id) => ctx.db.get(id))
    );

    return invites.map((invite) => ({
      ...invite,
      invitedByUser: inviters.find((user) => user?._id === invite.invitedBy) ?? null,
    }));
  },
});

export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query(invitesTable)
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    const church = await ctx.db.get(invitation.churchId);

    return {
      ...invitation,
      churchName: church?.name ?? null,
    };
  },
});

export const revokeInvitation = mutation({
  args: {
    invitationId: v.id(invitesTable),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new ConvexError("Invitation not found");
    }

    if (invitation.acceptedAt) {
      throw new ConvexError("Invitation has already been accepted");
    }

    await ctx.db.patch(invitation._id, {
      revokedAt: Date.now(),
    });
  },
});
