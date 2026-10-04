import { getMigrations } from "better-auth/db/migration";
import { readdir, readFile } from "node:fs/promises";
import { getAuth } from "../src/lib/server/auth";
import { db, transaction } from "../src/lib/server/db";

async function main() {
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(746021)");
    // Serialize auth and application schema changes across replicas. Auth
    // uses its own connections, while this transaction holds the shared lock.
    const migrations = await getMigrations(getAuth().options);
    await migrations.runMigrations();
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );

    for (const name of (await readdir("migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const previous = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [name],
      );

      if (previous.rowCount) continue;
      await client.query(await readFile("migrations/" + name, "utf8"));
      await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [
        name,
      ]);
      console.log("Applied " + name);
    }
  });
  await db().end();
}

main().catch(() => {
  console.error(
    "Migration failed. Check the database and environment configuration.",
  );
  process.exit(1);
});
