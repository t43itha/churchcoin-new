import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { Id } from "@/convex/_generated/dataModel";

import { api, convexServerClient } from "@/lib/convexServerClient";
import { ALL_ROLES, getRolePermissions } from "@/lib/rbac";
import type { UserRole } from "@/lib/rbac";

const SESSION_COOKIE = "churchcoin-session";

type SessionUser = {
  _id: Id<"users">;
  name: string;
  role: UserRole;
  churchId?: Id<"churches"> | null;
};

async function requireSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await convexServerClient.query(api.auth.getSession, {
    sessionToken: token,
  });

  if (!session) {
    return null;
  }

  return session.user as SessionUser;
}

export async function GET() {
  const user = await requireSession();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const permissions = getRolePermissions(user.role);

  if (!permissions.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!user.churchId) {
    return NextResponse.json(
      { error: "Unable to determine church context for this user" },
      { status: 400 }
    );
  }

  const invites = await convexServerClient.query(api.users.listInvitations, {
    churchId: user.churchId,
  });

  const formatted = invites.map((invite) => ({
    id: invite._id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt ?? null,
    revokedAt: invite.revokedAt ?? null,
    invitedBy: invite.invitedByUser
      ? {
          id: invite.invitedByUser._id,
          name: invite.invitedByUser.name,
        }
      : null,
  }));

  return NextResponse.json({ invites: formatted });
}

export async function POST(request: Request) {
  const user = await requireSession();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const permissions = getRolePermissions(user.role);

  if (!permissions.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!user.churchId) {
    return NextResponse.json(
      { error: "Unable to determine church context for this user" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "");

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  if (!ALL_ROLES.includes(role as UserRole)) {
    return NextResponse.json(
      { error: "Invalid role selected" },
      { status: 400 }
    );
  }

  try {
    const created = await convexServerClient.mutation(
      api.users.createInvitation,
      {
        email,
        role: role as UserRole,
        churchId: user.churchId,
        invitedBy: user._id,
      }
    );

    return NextResponse.json({
      invite: {
        id: created.invitationId,
        email,
        role,
        token: created.token,
        createdAt: Date.now(),
        expiresAt: created.expiresAt,
        invitedBy: {
          id: user._id,
          name: user.name,
        },
      },
    });
  } catch (error) {
    console.error("Failed to create invitation", error);
    return NextResponse.json(
      { error: "Unable to create invite for this email" },
      { status: 400 }
    );
  }
}
