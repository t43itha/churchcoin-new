import { NextResponse } from "next/server";

import { api, convexServerClient } from "@/lib/convexServerClient";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const result = await convexServerClient.mutation(api.auth.requestPasswordReset, {
      email,
    });

    const responseBody: Record<string, unknown> = { success: true };

    if (process.env.NODE_ENV !== "production" && result.token) {
      responseBody.token = result.token;
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to start password reset", error);
    return NextResponse.json({ success: true });
  }
}
