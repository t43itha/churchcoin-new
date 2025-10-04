import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { normalizeRole, type CanonicalRole } from "./roles";
import type { Doc, Id } from "./_generated/dataModel";

type PasswordParts = {
  salt: string;
  hash: string;
};

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const INVITE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const normaliseEmail = (email: string) => email.trim().toLowerCase();

const generateInviteToken = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const invitesTable = "userInvites" as const;

// Simple hash function for passwords (for demo purposes)
// In production, you'd want to use proper password hashing
const simpleHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
};

const splitSecret = (secret: string): PasswordParts | null => {
  const [salt, hash] = secret.split(":");
  if (!salt || !hash) {
    return null;
  }

  return { salt, hash };
};

const hashPassword = async (password: string): Promise<string> => {
  const salt = Math.random().toString(36).substring(2, 15);
  const derivedKey = simpleHash(password + salt);
  return `${salt}:${derivedKey}`;
};

const verifyPassword = async (password: string, secret: string) => {
  const parts = splitSecret(secret);
  if (!parts) {
    return false;
  }

  const derived = simpleHash(password + parts.salt);
  return derived === parts.hash;
};

const createSessionToken = () => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};

export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    churchName: v.optional(v.string()),
    churchId: v.optional(v.id("churches")),
    inviteToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normaliseEmail(args.email);

    const existingAccount = await ctx.db
      .query("authAccounts")
      .withIndex("by_provider_and_account_id", (q) =>
        q.eq("provider", "credentials").eq("providerAccountId", email)
      )
      .first();

    if (existingAccount) {
      throw new ConvexError("An account already exists for this email");
    }

    const passwordHash = await hashPassword(args.password);

    let churchId: Id<"churches"> | null = args.churchId ?? null;
    let role: CanonicalRole = "administrator";
    type InvitationDoc = Doc<"userInvites">;

    let invitation: InvitationDoc | null = null;

    if (args.inviteToken) {
      const inviteToken = args.inviteToken;
      invitation = await ctx.db
        .query("userInvites")
        .withIndex("by_token", (q) => q.eq("token", inviteToken))
        .first();

      if (!invitation) {
        throw new ConvexError("This invitation is no longer valid");
      }

      if (invitation.revokedAt) {
        throw new ConvexError("This invitation has been revoked");
      }

      if (invitation.acceptedAt) {
        throw new ConvexError("This invitation has already been used");
      }

      if (invitation.expiresAt <= Date.now()) {
        throw new ConvexError("This invitation has expired");
      }

      if (normaliseEmail(invitation.email) !== email) {
        throw new ConvexError(
          "This invitation was issued for a different email address"
        );
      }

      churchId = invitation.churchId;
      role = normalizeRole(invitation.role);
    }

    if (!churchId) {
      const existingChurch = await ctx.db.query("churches").first();
      if (existingChurch) {
        churchId = existingChurch._id;
      }
    }

    if (!churchId) {
      churchId = await ctx.db.insert("churches", {
        name: args.churchName ?? `${args.name}'s Church`,
        charityNumber: undefined,
        address: undefined,
        settings: {
          fiscalYearEnd: "03-31",
          giftAidEnabled: false,
          defaultCurrency: "GBP",
        },
      });
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email,
      role,
      churchId,
    });

    if (invitation) {
      await ctx.db.patch(invitation._id, {
        acceptedAt: Date.now(),
        acceptedBy: userId,
      });
    }

    await ctx.db.insert("authAccounts", {
      userId,
      type: "email",
      provider: "credentials",
      providerAccountId: email,
      secret: passwordHash,
    });

    const sessionToken = createSessionToken();
    const expires = Date.now() + SESSION_DURATION_MS;

    await ctx.db.insert("authSessions", {
      userId,
      sessionToken,
      expires,
    });

    const userDoc = await ctx.db.get(userId);
    if (!userDoc) {
      throw new ConvexError("Unable to load newly created user");
    }

    return {
      sessionToken,
      expires,
      user: { ...userDoc, role: normalizeRole(userDoc.role) },
    };
  },
});

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normaliseEmail(args.email);

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("by_provider_and_account_id", (q) =>
        q.eq("provider", "credentials").eq("providerAccountId", email)
      )
      .first();

    if (!account?.secret) {
      throw new ConvexError("Invalid email or password");
    }

    const isValid = await verifyPassword(args.password, account.secret);
    if (!isValid) {
      throw new ConvexError("Invalid email or password");
    }

    const user = await ctx.db.get(account.userId);
    if (!user) {
      throw new ConvexError("User not found for this account");
    }

    const sessionToken = createSessionToken();
    const expires = Date.now() + SESSION_DURATION_MS;

    await ctx.db.insert("authSessions", {
      userId: account.userId,
      sessionToken,
      expires,
    });

    return { sessionToken, expires, user: { ...user, role: normalizeRole(user.role) } };
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_session_token", (q) =>
        q.eq("sessionToken", args.sessionToken)
      )
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

export const getSession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_session_token", (q) =>
        q.eq("sessionToken", args.sessionToken)
      )
      .first();

    if (!session || session.expires < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return { session, user: { ...user, role: normalizeRole(user.role) } };
  },
});

export const extendSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_session_token", (q) =>
        q.eq("sessionToken", args.sessionToken)
      )
      .first();

    if (!session) {
      throw new ConvexError("Session not found");
    }

    const expires = Date.now() + SESSION_DURATION_MS;
    await ctx.db.patch(session._id, { expires });
    return { expires };
  },
});

export const listSessions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authSessions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
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
