/**
 * cognito-config.ts
 * Amplify v6 client-side configuration for AWS Cognito.
 * Import and call `configureAmplify()` once — at the top of _app or layout.
 */
import { Amplify } from "aws-amplify";

let configured = false;

export function configureAmplify() {
  if (configured) return;
  configured = true;

  Amplify.configure(
    {
      Auth: {
        Cognito: {
          userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOLS_ID!,
          userPoolClientId: process.env.NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID!,
          signUpVerificationMethod: "code",
          loginWith: {
            email: true,
          },
        },
      },
    },
    // Mark as server-side safe so Next.js SSR doesn't complain
    { ssr: true }
  );
}
