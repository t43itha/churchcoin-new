import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import type { Id } from "@/lib/convexGenerated";
import { api, convexServerClient } from "@/lib/convexServerClient";
import {
  SESSION_COOKIE_NAME,
  assertUserInChurch,
  requireSessionUser,
} from "@/lib/server-auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storageId: string }> }
) {
  try {
    const { storageId } = await context.params;
    const sessionResult = await requireSessionUser().catch((error: Error) => error);
    if (sessionResult instanceof Error) {
      const status = (sessionResult as { status?: number }).status ?? 500;
      return NextResponse.json({ error: sessionResult.message }, { status });
    }
    const user = sessionResult;

    const churchIdParam = request.nextUrl.searchParams.get("churchId");
    const resolvedChurchId = (churchIdParam ?? user.churchId ?? null) as
      | Id<"churches">
      | null;

    if (!resolvedChurchId) {
      return NextResponse.json({ error: "Church context is required" }, { status: 400 });
    }

    if (churchIdParam) {
      assertUserInChurch(user, resolvedChurchId);
    }

    const store = await cookies();
    const sessionToken = store.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const url = await convexServerClient.query(api.files.getReceiptUrl, {
      sessionToken,
      churchId: resolvedChurchId,
      storageId: storageId as Id<"_storage">,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to load receipt URL:", error);
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
      { error: "Failed to load receipt" },
      { status }
    );
  }
}
