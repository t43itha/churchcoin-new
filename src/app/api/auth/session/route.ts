import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/server-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const inviteToken = url.searchParams.get("invite");

  const user = await getSessionUser(inviteToken ?? undefined);

  return NextResponse.json({ user });
}
