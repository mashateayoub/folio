import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as authSchema from "@/server/database/schema/auth";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { db } from "@/server/database/client";
import { config } from "@/server/config";
import { sendMail } from "@/server/mail";

function createAuth() {
  const env = config();
  const origin = new URL(env.APP_URL);
  const trustedOrigins = [origin.origin];

  if (["localhost", "127.0.0.1"].includes(origin.hostname)) {
    const alternate = new URL(origin);
    alternate.hostname =
      origin.hostname === "localhost" ? "127.0.0.1" : "localhost";
    trustedOrigins.push(alternate.origin);
  }

  return betterAuth({
    appName: "Folio",
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db(), { provider: "pg", schema: authSchema }),
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        sendMail(
          user.email,
          "Reset your Folio password",
          "Reset your password using this link:\n\n" +
            url +
            "\n\nIf you didn't request this, ignore this email.",
        ),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) =>
        sendMail(
          user.email,
          "Verify your Folio email",
          "Welcome to Folio. Verify your email address:\n\n" + url,
        ),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    user: {
      additionalFields: {
        disabled: { type: "boolean", defaultValue: false, input: false },
      },
    },
    advanced: {
      useSecureCookies: origin.protocol === "https:",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
      },
    },
    plugins: [twoFactor({ issuer: "Folio" })],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return (instance ||= createAuth());
}

export type Actor = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  disabled: boolean;
  twoFactorEnabled: boolean;
};

export async function getActor(headers: Headers): Promise<Actor | null> {
  const session = await getAuth().api.getSession({ headers });

  if (!session || session.user.disabled) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    emailVerified: session.user.emailVerified,
    disabled: session.user.disabled,
    twoFactorEnabled: session.user.twoFactorEnabled ?? false,
  };
}
