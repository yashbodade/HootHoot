/**
 * simple-auth.ts — DEPRECATED.
 * This module has been replaced by AWS Cognito + aws-amplify.
 * It is kept as an empty stub so any stale imports do not crash the build.
 * All auth logic now lives in cognito-server.ts and auth-client.ts.
 */

export async function signInUser() {
  throw new Error("simple-auth is deprecated. Use AWS Cognito via auth-client.ts.");
}

export async function signUpUser() {
  throw new Error("simple-auth is deprecated. Use AWS Cognito via auth-client.ts.");
}

export async function verifyToken() {
  throw new Error("simple-auth is deprecated. Use AWS Cognito via auth-client.ts.");
}

export async function signOutUser() {
  throw new Error("simple-auth is deprecated. Use AWS Cognito via auth-client.ts.");
}
