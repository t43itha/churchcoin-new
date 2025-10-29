import { auth, currentUser } from "@clerk/nextjs/server";
import type { ConvexHttpClient } from "convex/browser";

import type { Id } from "@/lib/convexGenerated";
import { api, createConvexServerClient } from "@/lib/convexServerClient";
import { resolveUserRole, type UserRole } from "@/lib/rbac";

export type SessionUser = {
  _id: Id<"users">;
  name: string;
  role: UserRole;
  churchId?: Id<"churches"> | null;
};

export type SessionContext = {
  user: SessionUser;
  client: ConvexHttpClient;
};

async function ensureConvexUser(
  client: ConvexHttpClient,
  userId: string,
  inviteToken?: string | null
): Promise<SessionUser | null> {
  const clerkUser = await currentUser();

  const primaryEmail = clerkUser?.primaryEmailAddress?.emailAddress;
  const fallbackEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
  const email = primaryEmail ?? fallbackEmail ?? undefined;

  const fullName = clerkUser?.fullName?.trim();
  const compositeName = [clerkUser?.firstName, clerkUser?.lastName]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(" ")
    .trim();

  const ensured = await client.mutation(api.auth.ensureUser, {
    clerkUserId: userId,
    email,
    name: fullName || compositeName || clerkUser?.username || email,
    imageUrl: clerkUser?.imageUrl ?? undefined,
    inviteToken: inviteToken ?? undefined,
  });

  if (!ensured) {
    return null;
  }

  return {
    ...ensured,
    role: resolveUserRole(ensured.role),
  } as SessionUser;
}

async function loadConvexUser(inviteToken?: string | null): Promise<SessionUser | null> {
  const { userId, getToken } = await auth();

  if (!userId || !getToken) {
    return null;
  }

  const convexToken = await getToken({ template: "convex" });
  if (!convexToken) {
    return null;
  }

  const client = createConvexServerClient(convexToken);
  return ensureConvexUser(client, userId, inviteToken);
}

export async function getSessionUser(inviteToken?: string): Promise<SessionUser | null> {
  try {
    return await loadConvexUser(inviteToken);
  } catch (error) {
    console.error("Failed to resolve session user", error);
    return null;
  }
}

export async function requireSessionUser(inviteToken?: string): Promise<SessionUser> {
  const user = await getSessionUser(inviteToken);
  if (!user) {
    const error = new Error("Unauthorised");
    (error as { status?: number }).status = 401;
    throw error;
  }
  return user;
}

export async function getSessionContext(inviteToken?: string): Promise<SessionContext | null> {
  const { userId, getToken } = await auth();
  if (!userId || !getToken) {
    return null;
  }

  const convexToken = await getToken({ template: "convex" });
  if (!convexToken) {
    return null;
  }

  const client = createConvexServerClient(convexToken);
  const user = await ensureConvexUser(client, userId, inviteToken);

  if (!user) {
    return null;
  }

  return { client, user };
}

export async function requireSessionContext(inviteToken?: string): Promise<SessionContext> {
  const context = await getSessionContext(inviteToken);
  if (!context) {
    const error = new Error("Unauthorised");
    (error as { status?: number }).status = 401;
    throw error;
  }

  return context;
}

export function assertUserInChurch(
  user: SessionUser,
  churchId: Id<"churches">
) {
  if (!user.churchId || user.churchId !== churchId) {
    const error = new Error("Forbidden");
    (error as { status?: number }).status = 403;
    throw error;
  }
}
