import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { api, convexServerClient } from "@/lib/convexServerClient";

const SESSION_COOKIE = "churchcoin-session";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      await convexServerClient.mutation(api.auth.logout, {
        sessionToken: token,
      });
    } catch (error) {
      console.error("Failed to logout from Convex", error);
    }
  }

  store.delete(SESSION_COOKIE);

  return NextResponse.json({ ok: true });
}
