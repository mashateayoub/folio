import { spawn } from "node:child_process";
import { readFile, writeFile, chmod } from "node:fs/promises";
import { createInterface } from "node:readline";

if (process.env.NODE_ENV === "production")
  throw new Error("The Stripe CLI listener is for local development only.");

const destination =
  process.env.STRIPE_FORWARD_URL || "http://localhost:3030/api/billing/webhook";

const url = new URL(destination);

if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("The development listener requires a loopback destination.");

const events =
  "checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.paused,customer.subscription.resumed,invoice.paid,invoice.payment_failed,invoice.payment_action_required";

const listenerEnv = { ...process.env };

if (process.env.STRIPE_SECRET_KEY)
  listenerEnv.STRIPE_API_KEY = process.env.STRIPE_SECRET_KEY;

const child = spawn(
  "stripe",
  [
    "listen",
    "--events-from",
    "@self",
    "--events",
    events,
    "--forward-to",
    destination,
  ],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: listenerEnv,
  },
);

let configured = false;

async function line(value) {
  const secret = value.match(/whsec_[A-Za-z0-9]+/)?.[0];

  if (secret && !configured) {
    configured = true;
    const existing = await readFile(".env.local", "utf8");

    const lines = existing
      .split(/\r?\n/)
      .filter((entry) => entry && !entry.startsWith("STRIPE_WEBHOOK_SECRET="));

    await writeFile(
      ".env.local",
      lines.join("\n") + "\nSTRIPE_WEBHOOK_SECRET=" + secret + "\n",
    );
    await chmod(".env.local", 0o600);
    console.log(
      "Webhook signing secret saved privately in .env.local. Restart the web app to load it.",
    );

    return;
  }

  console.log(
    value.replace(/\b(?:whsec|sk|rk|oak)_[A-Za-z0-9_]+/g, "[redacted]"),
  );
}

for (const output of [child.stdout, child.stderr]) {
  const reader = createInterface({ input: output });
  reader.on("line", (value) => {
    void line(value).catch(() => {
      console.error(
        "Could not save the webhook secret. Check .env.local permissions.",
      );
      child.kill();
      process.exitCode = 1;
    });
  });
}

for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));

child.on("error", () => {
  console.error("Stripe CLI could not start. Check installation and login.");
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code || 0;
});
