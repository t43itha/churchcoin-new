import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

type PasswordParts = {
  salt: string;
  hash: string;
};

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const normaliseEmail = (email: string) => email.trim().toLowerCase();

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
    let role: "administrator" | "finance" | "pastorate" | "secured_guest" =
      "administrator";
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
      role = invitation.role;
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

    return {
      sessionToken,
      expires,
      user: await ctx.db.get(userId),
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

    return { sessionToken, expires, user };
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

    return { session, user };
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
