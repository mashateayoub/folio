import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { databaseUrl } from "@/server/config";
import * as schema from "@/server/database/schema/index";

declare global {
  var folioPool: Pool | undefined;
}

export function pool() {
  if (!globalThis.folioPool) {
    globalThis.folioPool = new Pool({
      connectionString: databaseUrl(),
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    globalThis.folioPool.on("error", () =>
      console.error("PostgreSQL connection failed."),
    );
  }

  return globalThis.folioPool;
}

export function db() {
  return drizzle(pool(), { schema });
}

export type DatabaseTransaction = Parameters<
  Parameters<ReturnType<typeof db>["transaction"]>[0]
>[0];

export function transaction<T>(
  work: (client: DatabaseTransaction) => Promise<T>,
) {
  return db().transaction(work);
}

export async function closeDatabase() {
  await pool().end();
  globalThis.folioPool = undefined;
}
