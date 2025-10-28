import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/server-auth";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ session: null, user: null });
    }

    return NextResponse.json({
      session: { userId: user._id },
      user,
    });
  } catch (error) {
    console.error("Failed to load session", error);
    return NextResponse.json({ session: null, user: null }, { status: 500 });
  }
}
