import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { api, convexServerClient } from "@/lib/convexServerClient";

const SESSION_COOKIE = "churchcoin-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const REFRESH_THRESHOLD = 60 * 60 * 24 * 7; // 7 days

export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ session: null });
  }

  const session = await convexServerClient.query(api.auth.getSession, {
    sessionToken: token,
  });

  if (!session) {
    store.delete(SESSION_COOKIE);
    return NextResponse.json({ session: null });
  }

  const expiresInSeconds = Math.floor((session.session.expires - Date.now()) / 1000);
  if (expiresInSeconds < REFRESH_THRESHOLD) {
    try {
      const extended = await convexServerClient.mutation(api.auth.extendSession, {
        sessionToken: token,
      });

      store.set({
        name: SESSION_COOKIE,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });

      return NextResponse.json({
        session: { ...session.session, expires: extended.expires },
        user: session.user,
      });
    } catch (error) {
      console.error("Failed to extend session", error);
    }
  }

  return NextResponse.json({ session: session.session, user: session.user });
}
