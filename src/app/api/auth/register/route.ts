import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Registration endpoint removed. Use Clerk Sign Up." },
    { status: 410 }
  );
}
