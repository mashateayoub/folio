import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";

let content = existsSync(".env.local")
  ? readFileSync(".env.local", "utf8")
  : "";

const existing = parseEnv(content);

const password = existing.POSTGRES_PASSWORD || randomBytes(24).toString("hex");

const defaults = {
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://folio:" + password + "@127.0.0.1:55432/folio",
  POSTGRES_PASSWORD: password,
  BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
  COMPILER_TOKEN: randomBytes(32).toString("hex"),
  COMPILER_URL: "http://127.0.0.1:4100",
  COMPILER_IMAGE: "folio-tex:local",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: "1025",
  SMTP_FROM: '"Folio <noreply@folio.local>"',
};

for (const [key, value] of Object.entries(defaults)) {
  if (!existing[key] || existing[key].includes("replace-")) {
    content = content.replace(new RegExp("^" + key + "=.*\\n?", "m"), "");
    content +=
      (content.endsWith("\n") || !content ? "" : "\n") +
      key +
      "=" +
      value +
      "\n";
  }
}

writeFileSync(".env.local", content, { mode: 0o600 });

chmodSync(".env.local", 0o600);

console.log(
  "Local configuration prepared. Secrets were kept private. Review APP_URL before starting the app.",
);
