import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { api, convexServerClient } from "@/lib/convexServerClient";

const SESSION_COOKIE = "churchcoin-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const result = await convexServerClient.mutation(api.auth.login, {
      email,
      password,
    });

    const cookieStore = await cookies();
    cookieStore.set({
      name: SESSION_COOKIE,
      value: result.sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return NextResponse.json({ user: result.user, expires: result.expires });
  } catch (error) {
    console.error("Failed to login", error);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
