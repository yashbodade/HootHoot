"use client";

/**
 * SessionContext.tsx
 * Provides the authenticated Cognito user to all client components.
 *
 * Strategy:
 * 1. On mount, call Amplify's getCurrentUser() to check if the user is
 *    already signed in via the local Amplify token store (IndexedDB/memory).
 * 2. If signed in, also call syncTokenCookie() so Server Components can read
 *    the cognito_id_token HttpOnly cookie on the next request.
 * 3. Expose `signOut()` which clears Amplify tokens AND the server cookie.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { configureAmplify } from "@/lib/cognito-config";
import {
  getCurrentUser as amplifyGetCurrentUser,
  fetchUserAttributes,
  signOut as amplifySignOut,
  fetchAuthSession,
} from "aws-amplify/auth";

// Configure Amplify once on the client side
configureAmplify();

export interface SessionUser {
  /** Cognito sub — used as userId in all DB queries */
  id: string;
  email: string;
  name: string;
  image: string | null;
}

interface SessionContextType {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Call after sign-in to refresh the context without a full page reload */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

async function syncCookieToServer(idToken: string) {
  try {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch {
    // Non-fatal
  }
}

async function clearCookieOnServer() {
  try {
    await fetch("/api/auth/signout", { method: "POST" });
  } catch {
    // Non-fatal
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    try {
      const cognitoUser = await amplifyGetCurrentUser();
      const attrs = await fetchUserAttributes();
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const sessionUser: SessionUser = {
        id: cognitoUser.userId,
        email: attrs.email ?? "",
        name: attrs.name ?? attrs.email ?? "Player",
        image: attrs.picture ?? null,
      };

      setUser(sessionUser);

      // Sync the ID token to the server-side HttpOnly cookie
      if (idToken) {
        await syncCookieToServer(idToken);
      }
    } catch {
      // Not signed in
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function signOut() {
    try {
      await amplifySignOut();
      await clearCookieOnServer();
    } finally {
      setUser(null);
      window.location.href = "/arena/auth";
    }
  }

  async function refresh() {
    setLoading(true);
    await loadUser();
  }

  return (
    <SessionContext.Provider value={{ user, loading, signOut, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
