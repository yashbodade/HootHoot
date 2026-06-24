import { NextResponse } from "next/server";

/**
 * /api/auth/signin — DEPRECATED stub.
 * Authentication is now handled entirely client-side via AWS Amplify.
 * The client calls Amplify's signIn(), then POSTs the ID token to
 * /api/auth/session to set the HttpOnly cookie.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Use the Amplify client-side signIn flow and POST to /api/auth/session.",
    },
    { status: 410 }
  );
}
