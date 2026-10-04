import { Pool, type PoolClient } from "pg";
import { databaseUrl } from "./config";

declare global {
  var folioPool: Pool | undefined;
}

const globalDb = globalThis;

export function db() {
  if (!globalDb.folioPool) {
    globalDb.folioPool = new Pool({
      connectionString: databaseUrl(),
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30_000,
    });
    globalDb.folioPool.on("error", () =>
      console.error("PostgreSQL connection failed."),
    );
  }

  return globalDb.folioPool;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await db().connect();

  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");

    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
