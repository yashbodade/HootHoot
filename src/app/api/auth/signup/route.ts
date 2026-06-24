import { NextResponse } from "next/server";

/**
 * /api/auth/signup — DEPRECATED stub.
 * Authentication is now handled entirely client-side via AWS Amplify.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Use the Amplify client-side signUp flow.",
    },
    { status: 410 }
  );
}
