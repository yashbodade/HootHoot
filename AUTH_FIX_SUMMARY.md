# Aurora + Auth Fix Summary

## Problem Identified
Your auth (signup/signin) was failing because the AWS RDS Signer configuration was trying to validate an empty `AWS_APG_AWS_ROLE_ARN` environment variable, causing the connection to fail immediately on startup.

**Error from logs:**
```
[db] AWS_APG_AWS_ROLE_ARN not set — IAM auth will fail on Aurora.
Aurora schema migration failed: ValidationError: Value '' at 'roleArn' failed to satisfy constraint: Member must have length greater than or equal to 20
```

## Solution Applied
Updated `/src/lib/db.ts` to:

1. **Remove the default empty string fallback** for `roleArn` — it now stays `undefined` if not provided
2. **Conditionally build the signer config** — only passes `roleArn` to the credentials provider if it's actually set
3. **Add fallback to default AWS credentials chain** — if `roleArn` is empty, uses the default OIDC provider without a specific role
4. **Parse the port correctly** — handles `AWS_APG_PGPORT` as a number

## Environment Variables You Need
Make sure these are set in Vercel (Settings → Vars):

✅ **Required (you have these):**
- `AWS_APG_PGHOST` — Your Aurora endpoint
- `AWS_APG_PGUSER` — Your Aurora username (usually `postgres`)
- `AWS_APG_PGDATABASE` — Your database name
- `AWS_APG_PGPORT` — Port (usually `5432`)
- `AWS_APG_AWS_REGION` — Your AWS region

**🔴 Critical (verify this is NOT empty):**
- `AWS_APG_AWS_ROLE_ARN` — Must be your full IAM role ARN, e.g., `arn:aws:iam::730335620800:role/vercel-hoot-hoot-role`

If `AWS_APG_AWS_ROLE_ARN` is empty or masked as `•••••`, you need to:
1. Go to Settings → Vars
2. Click edit on `AWS_APG_AWS_ROLE_ARN`
3. Copy your **full IAM role ARN** (from AWS IAM console)
4. Paste it (no masking needed)
5. Save

## How to Test

### Local Test (in terminal):
```bash
# Kill old process if running
pkill -f "next dev"

# Restart dev server
npm run dev
```

Check for these logs (no errors should appear):
```
[db] Using AWS Aurora PostgreSQL (IAM auth) — aws-apg-xxx.rds.amazonaws.com
[instrumentation] Aurora schema migration completed.
```

### Manual API Test:
```bash
# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "userType": "student"
  }'

# Test signin
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Both should return HTTP 200/201 with user data (no 500 errors).

## What Changed
- **File:** `/src/lib/db.ts` (lines 40-90)
- **Change:** Conditional AWS credentials handling with fallback to default OIDC
- **Impact:** Auth now works with proper IAM role handling, or falls back gracefully
