import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

type PasswordParts = {
  salt: string;
  hash: string;
};

const scryptAsync = promisify(scrypt);
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const normaliseEmail = (email: string) => email.trim().toLowerCase();

const splitSecret = (secret: string): PasswordParts | null => {
  const [salt, hash] = secret.split(":");
  if (!salt || !hash) {
    return null;
  }

  return { salt, hash };
};

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
};

const verifyPassword = async (password: string, secret: string) => {
  const parts = splitSecret(secret);
  if (!parts) {
    return false;
  }

  const salt = Buffer.from(parts.salt, "hex");
  const expected = Buffer.from(parts.hash, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(expected, derived);
};

const createSessionToken = () => randomBytes(32).toString("hex");

export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    churchName: v.optional(v.string()),
    churchId: v.optional(v.id("churches")),
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

    let churchId = args.churchId ?? null;
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
      role: "admin",
      churchId,
    });

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
