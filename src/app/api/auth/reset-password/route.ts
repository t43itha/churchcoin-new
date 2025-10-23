import { NextResponse } from "next/server";

import { api, convexServerClient } from "@/lib/convexServerClient";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and new password are required" },
      { status: 400 }
    );
  }

  try {
    await convexServerClient.mutation(api.auth.resetPassword, {
      token,
      password,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reset password", error);

    const message =
      error instanceof Error ? error.message : "Unable to reset your password";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
