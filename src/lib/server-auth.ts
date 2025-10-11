import { cookies } from "next/headers";

import type { Id } from "@/lib/convexGenerated";
import { api, convexServerClient } from "@/lib/convexServerClient";
import { resolveUserRole, type UserRole } from "@/lib/rbac";

export const SESSION_COOKIE_NAME = "churchcoin-session";

export type SessionUser = {
  _id: Id<"users">;
  name: string;
  role: UserRole;
  churchId?: Id<"churches"> | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await convexServerClient.query(api.auth.getSession, {
    sessionToken: token,
  });

  if (!session?.user) {
    return null;
  }

  return {
    ...session.user,
    role: resolveUserRole(session.user.role),
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
