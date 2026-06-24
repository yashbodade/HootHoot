/**
 * auth-client.ts — client-side Amplify auth helpers.
 *
 * All client components should use these helpers instead of importing
 * Amplify directly, to ensure configureAmplify() is always called first.
 */
"use client";

import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  resendSignUpCode,
  type SignInInput,
  type SignUpInput,
} from "aws-amplify/auth";
import { configureAmplify } from "./cognito-config";

// Always configure before any auth operation
configureAmplify();

export {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  resendSignUpCode,
};

export type { SignInInput, SignUpInput };

/**
 * Get the current user's ID token to send to the server.
 * Returns null if not signed in.
 */
export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

/**
 * Sync the Cognito ID token to our HttpOnly cookie so server components can
 * read it. Call this after signIn and on app mount.
 */
export async function syncTokenCookie(): Promise<void> {
  try {
    const token = await getIdToken();
    if (!token) return;
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });
  } catch {
    // Non-fatal: server session will just appear as logged out
  }
}
