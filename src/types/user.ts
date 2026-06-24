/**
 * Shared user type used across server and client components.
 * The `id` field is the Cognito `sub` — a stable UUID.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
  /** Legacy isPro field retained for backward compatibility */
  isPro?: boolean;
}
