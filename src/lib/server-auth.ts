import { auth, clerkClient } from "@clerk/nextjs/server";

import type { Id } from "@/lib/convexGenerated";
import { api, convexServerClient } from "@/lib/convexServerClient";
import { resolveUserRole, type UserRole } from "@/lib/rbac";

export type SessionUser = {
  _id: Id<"users">;
  name: string;
  role: UserRole;
  churchId?: Id<"churches"> | null;
};

function deriveDisplayName(options: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) {
  const { fullName, firstName, lastName, email } = options;
  const composite = [firstName, lastName].filter(Boolean).join(" ");

  return (fullName?.trim() || composite || email).trim();
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const authState = await auth();

  if (!authState.userId) {
    return null;
  }

  const clerkUser = await clerkClient.users.getUser(authState.userId);
  const email = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase();

  if (!email) {
    return null;
  }

  const name = deriveDisplayName({
    fullName: clerkUser.fullName,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    email,
  });

  const profile = await convexServerClient.mutation(api.auth.ensureUserProfile, {
    clerkUserId: authState.userId,
    email,
    name,
  });

  return {
    _id: profile._id,
    name: profile.name,
    role: resolveUserRole(profile.role),
    churchId: profile.churchId ?? null,
  } as SessionUser;
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const error = new Error("Unauthorised");
    (error as { status?: number }).status = 401;
    throw error;
  }
  return user;
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
