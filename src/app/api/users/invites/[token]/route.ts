import { NextResponse } from "next/server";

import { api, createConvexServerClient } from "@/lib/convexServerClient";
import { requireSessionContext } from "@/lib/server-auth";
import { getRolePermissions, resolveUserRole } from "@/lib/rbac";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  const client = createConvexServerClient();
  const invitation = await client.query(api.auth.getInvitationByToken, {
    token,
  });

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
  const session = await requireSessionContext().catch((error: Error) => error);

  if (session instanceof Error) {
    const status = (session as { status?: number }).status ?? 401;
    return NextResponse.json({ error: session.message || "Unauthorised" }, { status });
  }

  const { user, client } = session;

  const permissions = getRolePermissions(user.role);

  if (!permissions.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { token } = await context.params;

  const invitation = await client.query(api.auth.getInvitationByToken, {
    token,
  });

  if (!invitation || !user.churchId || invitation.churchId !== user.churchId) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  await client.mutation(api.auth.revokeInvitation, {
    invitationId: invitation._id,
  });

  return NextResponse.json({ success: true });
}
