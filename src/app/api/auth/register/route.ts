import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { api, convexServerClient } from "@/lib/convexServerClient";

const SESSION_COOKIE = "churchcoin-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const churchName = body.churchName ? String(body.churchName) : undefined;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are required" },
      { status: 400 }
    );
  }

  try {
    const result = await convexServerClient.mutation(api.auth.register, {
      name,
      email,
      password,
      churchName,
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
    console.error("Failed to register", error);
    return NextResponse.json(
      { error: "Could not create your account" },
      { status: 400 }
    );
  }
}
