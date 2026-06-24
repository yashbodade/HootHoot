import { NextResponse } from "next/server";

/**
 * /api/auth/[...all] — stub that replaces the old Better Auth catch-all.
 * All authentication is now handled client-side by AWS Amplify + Cognito.
 * The only server auth endpoint is /api/auth/session (token cookie sync).
 */
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
