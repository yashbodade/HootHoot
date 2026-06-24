"use server";

/**
 * features/auth/actions.ts
 * Server action for sign-out — kept for backward compat with Header.tsx.
 * The actual Cognito sign-out (clearing Amplify tokens) happens client-side
 * in SessionContext. This action only clears the server-side cookie.
 */
export async function signOut() {
  // The client (SessionContext / Header) calls Amplify signOut() first,
  // then hits /api/auth/signout to clear the HttpOnly cookie.
  // This server action is a no-op to avoid breaking existing imports.
  return { status: true };
}
