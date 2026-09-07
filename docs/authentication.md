# Better Auth authentication

Issue: https://github.com/barsham/ChantLive/issues/16

ChantLive uses Better Auth for email/password authentication, verification,
password recovery, signed cookies, session expiry and request rate limiting.
The current React forms keep their existing API URLs through an Express adapter.
The adapter forwards a reconstructed Fetch Request through Better Auth's public
handler, retaining origin checks and rate limits after Express parses JSON.
Logout now uses POST. Protected routes resolve the session and load current
roles from the database, so a role change takes effect immediately.

## Configuration and deployment

- Use Node.js 22.16+ (ESM server output is `dist/index.js`). Run `npm install`,
  `npm run check`, `npx tsx --test server/auth.test.ts server/email.test.ts`, and
  `npm run build` before deployment.
- Set `PUBLIC_BASE_URL` to the HTTPS application origin in production.
- Set `BETTER_AUTH_SECRET` to at least 32 random characters. Existing installations
  can keep `SESSION_SECRET` if it meets that minimum. Keep this value stable.
- Keep the SendGrid settings described in [email setup](email-setup.md).
  Delivery errors fail registration and unverified accounts cannot sign in.
  Retrying registration resends a verification link without changing the saved
  password or name. Use password recovery to change a forgotten password.
- For a new installation, set `INITIAL_ADMIN_EMAIL` to the intended owner's email
  before they register. Only that email is granted `super_admin`; verification
  is still required. Remove the variable after setup. This replaces automatically
  promoting whoever happens to register first. Existing roles are unchanged.
- Configure `TRUST_PROXY_HOPS` to the actual number of trusted proxy hops (default
  zero). Express resolves the client IP; the adapter overwrites the private IP
  header before forwarding it to Better Auth. Never trust arbitrary forwarded IPs.
  Set `HOST=127.0.0.1` when nginx runs on the same host to prevent direct access
  that bypasses the trusted proxy.
- `DEV_SKIP_EMAIL_VERIFICATION=true` still works only in development.

## Existing account migration

Production deployment runs `npx tsx script/migrate-auth.ts` while the old service
is stopped. The startup readiness check also executes this additive migration in a transaction,
serialized by a PostgreSQL advisory lock, before accepting API traffic. Back up
the database before deployment. Stop old instances before starting the new
version; do not run both authentication implementations concurrently. The migration creates `auth_accounts`,
`auth_sessions`, and `auth_verifications`, and adds `users.updated_at`.
It copies bcrypt password hashes into credential accounts while preserving user
IDs, email verification, roles and demonstration ownership. New and reset
passwords use Better Auth's scrypt hashing. Legacy hashes and recovery tokens
are cleared after import; repeated startup cannot overwrite a changed password.

Existing sessions are intentionally not imported: users must sign in again.
Previously issued verification/reset links must be replaced using registration
or password recovery. The legacy `session` table is left in place but unused.
Do not roll back to the old authentication code after migration without a
planned data migration: old password columns have been cleared.

The native Better Auth endpoints are also available at `/api/auth/*`.
Current UI compatibility routes are `/register`, `/login`, `/forgot-password`,
`/reset-password`, and `/me` under that prefix. Authentication response bodies
are excluded from application request logs.

## Verification

`server/auth.test.ts` runs against an isolated in-memory PostgreSQL-compatible
PGlite database and mocked SendGrid transport. It checks migration idempotency,
legacy passwords and roles, unverified sign-in rejection, verification links,
cookies, cross-origin rejection, logout, reset token reuse, session revocation,
password persistence across migration reruns, and email delivery failures.
It never connects to the deployment database or sends real email.

References: [Express integration](https://better-auth.com/docs/integrations/express),
[Drizzle adapter](https://better-auth.com/docs/adapters/drizzle),
[email/password](https://better-auth.com/docs/authentication/email-password).
