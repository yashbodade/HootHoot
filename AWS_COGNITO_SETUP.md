# AWS Cognito Setup Guide for Hoot-Hoot

## Step 1 — Create a Cognito User Pool

1. Open the **AWS Console** → navigate to **Cognito** → click **Create user pool**.
2. Configure authentication:
   - **Sign-in options**: check **Email**
   - **Password policy**: Minimum 8 characters, require number (Amplify enforces this)
   - **MFA**: Optional — set to "No MFA" for simplest setup
3. Configure sign-up:
   - **Required attributes**: `email`, `name`
   - **Verification**: Email verification — choose "Send email message"
   - Leave "Keep original attribute value active" checked
4. Configure message delivery:
   - Use Cognito's default email (free up to 50 emails/day) or configure SES for production
5. App integration:
   - **User pool name**: `hoot-hoot-users` (or any name)
   - **Hosted UI**: NOT required (we use Amplify UI directly)
6. Create an **App client**:
   - App type: **Public client** (no client secret — required for Amplify browser SDK)
   - App client name: `hoot-hoot-web`
   - Authentication flows: Enable `ALLOW_USER_SRP_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`
   - **Callback URLs**: not needed (no hosted UI)
7. Click **Create user pool**.

## Step 2 — Note Down Your Values

After creation, collect:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_AWS_COGNITO_REGION` | AWS region you created the pool in, e.g. `us-east-1` |
| `NEXT_PUBLIC_AWS_USER_POOLS_ID` | User pool overview page — "User pool ID" |
| `NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID` | App integration tab → App clients → "Client ID" |

## Step 3 — Add Environment Variables in v0

Go to **Settings → Vars** in the v0 UI and add:

```
NEXT_PUBLIC_AWS_COGNITO_REGION=us-east-1
NEXT_PUBLIC_AWS_USER_POOLS_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

These variables are prefixed with `NEXT_PUBLIC_` so the browser-side Amplify SDK can read them.
Your existing Aurora variables (`PGHOST`, `AWS_REGION`, `AWS_ROLE_ARN`, etc.) stay unchanged.

## Step 4 — Run the Database Migration

Run the migration script against your Aurora cluster once:

```bash
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/002-cognito-auth-migration.sql
```

Or paste the contents into your Aurora query editor in the AWS Console.

## Step 5 — Configure Cognito Custom Attributes (Optional)

If you want to store the user's role (student/company) in Cognito:

1. User pool → **Attributes** → **Add custom attributes**
2. Add: `custom:role` (String, not required, mutable)

This is already handled in the sign-up flow in `src/app/arena/auth/page.tsx`.

## How It Works After Setup

- **Sign Up**: Amplify's `signUp()` creates the user in Cognito. Cognito sends a verification email.
- **Confirm**: User enters the 6-digit code. Amplify's `confirmSignUp()` verifies them.
- **Sign In**: Amplify's `signIn()` exchanges credentials for JWT tokens stored in the browser.
- **Session persistence**: Amplify stores tokens in localStorage/IndexedDB. On every page load, `SessionContext` calls `getCurrentUser()` — if tokens are valid, the user is considered signed in without a network round-trip to Cognito.
- **Server auth**: After sign-in, the client POSTs the Cognito ID token to `/api/auth/session`. The server verifies the token against Cognito's JWKS, then stores it as an HttpOnly cookie (`cognito_id_token`). Server components and API routes read this cookie via `getCurrentUser()` in `src/lib/cognito-server.ts`.
- **Token refresh**: Cognito ID tokens expire after 1 hour. The HttpOnly cookie is refreshed automatically whenever `syncTokenCookie()` is called (e.g. on each page load via `SessionContext`). Amplify refresh tokens last 30 days by default.
- **Sign Out**: Amplify's `signOut()` clears local tokens. A POST to `/api/auth/signout` clears the HttpOnly cookie.
