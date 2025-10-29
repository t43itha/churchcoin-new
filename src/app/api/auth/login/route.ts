import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Credentials endpoint removed. Use Clerk Sign In." },
    { status: 410 }
  );
}
