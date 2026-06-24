/**
 * subscription.ts — DEPRECATED / stub.
 *
 * The Razorpay subscription system has been decoupled from the Better Auth
 * user table. This file is a no-op stub to prevent build errors while the
 * subscription system is rebuilt for the Cognito + AWS architecture.
 *
 * getUserIsPro always returns false until the new subscription tables are created.
 */
import { cache } from "react";

export const getUserIsPro = cache(async (_userId: string): Promise<boolean> => {
  return false;
});
