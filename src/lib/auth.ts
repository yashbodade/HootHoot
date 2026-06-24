/**
 * auth.ts — re-exports the server-side Cognito helper as `auth`.
 *
 * All server components/actions that previously called `auth.api.getSession()`
 * now call `auth.getCurrentUser()` which reads the `cognito_id_token` cookie
 * and verifies it against Cognito JWKS.
 */
export { getCurrentUser, getUserFromBearer } from "./cognito-server";

/** Compatibility shim so existing call-sites that use `auth.api.getSession()` work
 *  with minimal changes. Only what is actually called in this codebase is included. */
export const auth = {
  api: {
    /** Drop-in replacement for better-auth's getSession({ headers }) */
    getSession: async (_opts?: { headers?: unknown }) => {
      const { getCurrentUser } = await import("./cognito-server");
      const user = await getCurrentUser();
      if (!user) return null;
      return {
        user: {
          id: user.sub,
          email: user.email,
          name: user.name,
          image: null as string | null,
          emailVerified: user.email_verified,
          createdAt: new Date(),
        },
      };
    },
    signOut: async (_opts?: { headers?: unknown }) => {
      // Server-side sign-out just clears the cookie — handled in the API route.
      return { success: true };
    },
  },
};
