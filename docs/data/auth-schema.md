# Generated authentication schema

The following is column metadata from the migrated local PostgreSQL schema on 2026-10-04. It contains no user records, token values, hashes, or credentials. Better Auth owns these tables; its installed options and migration runner determine exact columns. Re-inspect on library/plugin upgrades rather than treating this snapshot as migration code.

Identity includes account/user, session, verification, two-factor, and rate-limit storage. Application IDs reference the auth `user.id` text key. Credentials/session/plugin storage must be backed up and access-restricted alongside tenant data.

## `account`

| Column                  | PostgreSQL type            | Nullable | Default             |
| ----------------------- | -------------------------- | -------- | ------------------- |
| `id`                    | `text`                     | NO       | `—`                 |
| `accountId`             | `text`                     | NO       | `—`                 |
| `providerId`            | `text`                     | NO       | `—`                 |
| `userId`                | `text`                     | NO       | `—`                 |
| `accessToken`           | `text`                     | YES      | `—`                 |
| `refreshToken`          | `text`                     | YES      | `—`                 |
| `idToken`               | `text`                     | YES      | `—`                 |
| `accessTokenExpiresAt`  | `timestamp with time zone` | YES      | `—`                 |
| `refreshTokenExpiresAt` | `timestamp with time zone` | YES      | `—`                 |
| `scope`                 | `text`                     | YES      | `—`                 |
| `password`              | `text`                     | YES      | `—`                 |
| `createdAt`             | `timestamp with time zone` | NO       | `CURRENT_TIMESTAMP` |
| `updatedAt`             | `timestamp with time zone` | NO       | `—`                 |

## `rateLimit`

| Column        | PostgreSQL type | Nullable | Default |
| ------------- | --------------- | -------- | ------- |
| `id`          | `text`          | NO       | `—`     |
| `key`         | `text`          | NO       | `—`     |
| `count`       | `integer`       | NO       | `—`     |
| `lastRequest` | `bigint`        | NO       | `—`     |

## `session`

| Column      | PostgreSQL type            | Nullable | Default             |
| ----------- | -------------------------- | -------- | ------------------- |
| `id`        | `text`                     | NO       | `—`                 |
| `expiresAt` | `timestamp with time zone` | NO       | `—`                 |
| `token`     | `text`                     | NO       | `—`                 |
| `createdAt` | `timestamp with time zone` | NO       | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp with time zone` | NO       | `—`                 |
| `ipAddress` | `text`                     | YES      | `—`                 |
| `userAgent` | `text`                     | YES      | `—`                 |
| `userId`    | `text`                     | NO       | `—`                 |

## `twoFactor`

| Column                    | PostgreSQL type            | Nullable | Default |
| ------------------------- | -------------------------- | -------- | ------- |
| `id`                      | `text`                     | NO       | `—`     |
| `secret`                  | `text`                     | NO       | `—`     |
| `backupCodes`             | `text`                     | NO       | `—`     |
| `userId`                  | `text`                     | NO       | `—`     |
| `verified`                | `boolean`                  | YES      | `—`     |
| `failedVerificationCount` | `integer`                  | YES      | `—`     |
| `lockedUntil`             | `timestamp with time zone` | YES      | `—`     |

## `user`

| Column             | PostgreSQL type            | Nullable | Default             |
| ------------------ | -------------------------- | -------- | ------------------- |
| `id`               | `text`                     | NO       | `—`                 |
| `name`             | `text`                     | NO       | `—`                 |
| `email`            | `text`                     | NO       | `—`                 |
| `emailVerified`    | `boolean`                  | NO       | `—`                 |
| `image`            | `text`                     | YES      | `—`                 |
| `createdAt`        | `timestamp with time zone` | NO       | `CURRENT_TIMESTAMP` |
| `updatedAt`        | `timestamp with time zone` | NO       | `CURRENT_TIMESTAMP` |
| `twoFactorEnabled` | `boolean`                  | YES      | `—`                 |
| `disabled`         | `boolean`                  | NO       | `—`                 |

## `verification`

| Column       | PostgreSQL type            | Nullable | Default             |
| ------------ | -------------------------- | -------- | ------------------- |
| `id`         | `text`                     | NO       | `—`                 |
| `identifier` | `text`                     | NO       | `—`                 |
| `value`      | `text`                     | NO       | `—`                 |
| `expiresAt`  | `timestamp with time zone` | NO       | `—`                 |
| `createdAt`  | `timestamp with time zone` | NO       | `CURRENT_TIMESTAMP` |
| `updatedAt`  | `timestamp with time zone` | NO       | `CURRENT_TIMESTAMP` |

## Ownership and inspection

Auth tables are generated rather than maintained in Folio SQL migrations. The table snapshot above does not enumerate every index/foreign-key constraint. Use read-only `information_schema`/PostgreSQL catalog inspection to inspect those when upgrading. Avoid posting record contents or decrypted MFA material in support output. See [migrations](migrations.md) and [authentication](../security/authentication.md).

[Migration runner](../../scripts/migrate.ts) · [Auth configuration](../../src/lib/server/auth.ts)
