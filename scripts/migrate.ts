import { readdir, readFile } from "node:fs/promises";
import { sql, eq } from "drizzle-orm";
import { closeDatabase, transaction } from "@/server/database/client";
import { schemaMigrations } from "@/server/database/schema/index";

async function main() {
  await transaction(async (client) => {
    await client.execute(sql`SELECT pg_advisory_xact_lock(746021)`);
    await client.execute(
      sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
    );

    for (const name of (await readdir("migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const previous = await client
        .select()
        .from(schemaMigrations)
        .where(eq(schemaMigrations.name, name));

      if (previous.length) continue;
      // Only reviewed migration files are SQL programs; request data is never raw SQL.
      await client.execute(
        sql.raw(await readFile("migrations/" + name, "utf8")),
      );
      await client.insert(schemaMigrations).values({ name });
      console.log("Applied " + name);
    }
  });
  await closeDatabase();
}

main().catch(() => {
  console.error(
    "Migration failed. Check the database and environment configuration.",
  );
  process.exit(1);
});
