import { NextResponse } from "next/server";

/**
 * POST /api/auth/signout
 * Clears the HttpOnly cognito_id_token cookie.
 * The client side is responsible for calling Amplify's signOut() first.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("cognito_id_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
