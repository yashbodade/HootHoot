import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/session
 * Verify the cognito_id_token cookie and return the user profile.
 */
export async function GET() {
  const { getCurrentUser } = await import("@/lib/cognito-server");
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.sub,
      email: user.email,
      name: user.name,
      emailVerified: user.email_verified,
    },
  });
}

/**
 * POST /api/auth/session
 * Receives the Cognito ID token from the client after sign-in, verifies it,
 * stores it as an HttpOnly cookie, and upserts the user into cognito_users.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const { getUserFromBearer } = await import("@/lib/cognito-server");
    const user = await getUserFromBearer(`Bearer ${idToken}`);

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Upsert user into cognito_users so leaderboard and scores can JOIN on it
    try {
      const { auroraQuery } = await import("@/lib/db-aurora");
      await auroraQuery(
        `INSERT INTO cognito_users (sub, email, name, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (sub) DO UPDATE
           SET email      = EXCLUDED.email,
               name       = EXCLUDED.name,
               updated_at = NOW()`,
        [user.sub, user.email, user.name]
      );
    } catch (dbErr) {
      // Non-fatal — the cookie will still be set
      console.error("[session] cognito_users upsert failed:", dbErr);
    }

    const response = NextResponse.json({ ok: true, userId: user.sub });

    response.cookies.set("cognito_id_token", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour — matches Cognito ID token expiry
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[auth/session] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
