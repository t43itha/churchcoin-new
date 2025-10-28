import { NextResponse } from "next/server";

import type { Id } from "@/lib/convexGenerated";
import { api, convexServerClient } from "@/lib/convexServerClient";
import { assertUserInChurch, requireSessionUser } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const sessionResult = await requireSessionUser().catch((error: Error) => error);
    if (sessionResult instanceof Error) {
      const status = (sessionResult as { status?: number }).status ?? 500;
      return NextResponse.json({ error: sessionResult.message }, { status });
    }
    const user = sessionResult;

    const { churchId } = body as { churchId?: string };
    const resolvedChurchId = (churchId ?? user.churchId ?? null) as
      | Id<"churches">
      | null;

    if (!resolvedChurchId) {
      return NextResponse.json({ error: "Church context is required" }, { status: 400 });
    }

    if (churchId) {
      assertUserInChurch(user, resolvedChurchId);
    }

    const uploadUrl = await convexServerClient.mutation(
      api.files.generateReceiptUploadUrl,
      {
        userId: user._id,
        churchId: resolvedChurchId,
      }
    );

    return NextResponse.json({ uploadUrl });
  } catch (error) {
    console.error("Failed to generate upload URL:", error);
    const status =
      typeof (error as { status?: number })?.status === "number"
        ? (error as { status: number }).status
        : 500;

    if (status === 401) {
      return NextResponse.json({ error: "Unauthorised" }, { status });
    }

    if (status === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status });
    }

    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status }
    );
  }
}
