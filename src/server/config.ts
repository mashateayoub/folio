import { z } from "zod";

const schema = z.object({
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  BETTER_AUTH_SECRET: z.string().min(32),
  COMPILER_TOKEN: z.string().min(24),
  COMPILER_URL: z.string().url().default("http://127.0.0.1:4100"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().default("Folio <noreply@folio.local>"),
});

export function config() {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success)
    throw new Error(
      "Server configuration is incomplete: " +
        parsed.error.issues.map((issue) => issue.path.join(".")).join(", ") +
        ". Run npm run setup.",
    );
  const value = parsed.data;

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_INSECURE_LOCAL_DEV !== "true" &&
    !value.APP_URL.startsWith("https://")
  )
    throw new Error("Production APP_URL requires HTTPS.");

  if (
    value.BETTER_AUTH_SECRET.includes("replace-") ||
    value.COMPILER_TOKEN.includes("replace-")
  )
    throw new Error("Replace example secrets before starting the app.");

  return value;
}

export function databaseUrl() {
  const url = new URL(config().DATABASE_URL);

  if (process.env.DATABASE_HOST) url.hostname = process.env.DATABASE_HOST;

  if (process.env.DATABASE_PORT) url.port = process.env.DATABASE_PORT;

  return url.toString();
}
