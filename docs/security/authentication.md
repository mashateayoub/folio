# Authentication and account lifecycle

Better Auth receives a PostgreSQL pool and exposes its Next handler under `/api/auth/[...all]`. The browser client registers the two-factor plugin. Folio's `getActor()` asks the current auth instance for the request session and rejects missing/disabled users. Application routes do not accept a client-supplied user ID as identity.

Email/password authentication requires verification. Password length is 12–128 characters. Verification email is sent at signup and when needed at sign-in; verification does not automatically sign in. Reset email uses the configured app origin. Password reset revokes existing sessions. Account password change requests revocation of other sessions through the client flow.

Sessions expire after seven days and refresh on the configured daily update age. Cookie cache is disabled, so the application consults current database-backed session state rather than relying on a cached session payload. Cookies are HttpOnly, SameSite Lax, root-path; HTTPS origins use secure cookies. Database session records are sensitive.

The `disabled` user field is server-owned (`input:false`) and defaults false. It cannot be set through signup JSON. Workspace roles live in Folio membership records, not a submitted auth role. There is no shipped administrative account-disable UI.

MFA uses Better Auth's two-factor plugin with issuer Folio. Account settings generates TOTP setup and recovery codes, verifies setup, and supports disabling with password. Sign-in may redirect to `/two-factor`; the UI accepts TOTP or a one-time recovery code. It sets `trustDevice:false` for TOTP verification.

The sign-in destination is restricted to `/` or a 64-hex-character invitation path. Arbitrary `next` URLs are not used. Auth trusted origins include the configured origin and its localhost/127.0.0.1 alternate for local use.

Auth rate limits are database-backed: default 60 requests/60 seconds, sign-in 8/60, signup 5/60, recovery request 3/60. Repeated acceptance suites can trigger them; tests must not disable these controls to pass.

Email transport, generated tables, and permission checks are explained in [email](../operations/email.md), [auth schema](../data/auth-schema.md), and [authorization](authorization.md).

## Implementation references

- [src/lib/server/auth.ts](../../src/lib/server/auth.ts)
- [src/lib/auth-client.ts](../../src/lib/auth-client.ts)
- [src/components/auth-screen.tsx](../../src/components/auth-screen.tsx)
- [src/components/account-settings.tsx](../../src/components/account-settings.tsx)
