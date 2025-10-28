import { NextResponse } from "next/server";

import type { Id } from "@/lib/convexGenerated";

import { api, convexServerClient } from "@/lib/convexServerClient";
import { getRolePermissions, resolveUserRole } from "@/lib/rbac";
import type { UserRole } from "@/lib/rbac";
import { requireSessionUser } from "@/lib/server-auth";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  const invitation = await convexServerClient.query(
    api.auth.getInvitationByToken,
    { token }
  );

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    invite: {
      email: invitation.email,
      role: resolveUserRole(invitation.role),
      churchName: invitation.churchName,
      churchId: invitation.churchId,
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  let user: { _id: Id<"users">; role: UserRole; churchId?: Id<"churches"> | null };

  try {
    user = await requireSessionUser();
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    console.error("Failed to verify session for invite deletion", error);
    return NextResponse.json(
      { error: "Unable to verify your permissions" },
      { status: 500 }
    );
  }

  const permissions = getRolePermissions(user.role);

  if (!permissions.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { token } = await context.params;

  const invitation = await convexServerClient.query(
    api.auth.getInvitationByToken,
    { token }
  );

  if (!invitation || !user.churchId || invitation.churchId !== user.churchId) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  await convexServerClient.mutation(api.auth.revokeInvitation, {
    invitationId: invitation._id,
  });

  return NextResponse.json({ success: true });
}
