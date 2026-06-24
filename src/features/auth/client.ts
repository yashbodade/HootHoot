/**
 * features/auth/client.ts — DEPRECATED stub.
 * Google OAuth sign-in via Better Auth has been replaced by AWS Cognito.
 * Cognito supports social login (Google) natively via the hosted UI or
 * Amplify's `signInWithRedirect({ provider: "Google" })`.
 *
 * To re-enable Google sign-in, configure the Google Identity Provider in
 * your Cognito User Pool and use:
 *   import { signInWithRedirect } from "aws-amplify/auth";
 *   await signInWithRedirect({ provider: "Google" });
 */
export const signInWithGoogle = async () => {
  console.warn("signInWithGoogle: Google sign-in is not yet configured. See features/auth/client.ts.");
};
