import { sql } from "drizzle-orm";
import { type DatabaseTransaction } from "@/server/database/client";
import { HttpError } from "@/server/http";

export async function consume(
  client: DatabaseTransaction,
  key: string,
  limit: number,
  ttlSeconds: number,
) {
  const result = await client.execute(
    sql`INSERT INTO usage_counters(key,count,expires_at) VALUES (${key},1,now()+${ttlSeconds}*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=usage_counters.count+1 WHERE usage_counters.count<${limit} RETURNING count`,
  );

  if (!result.rowCount)
    throw new HttpError(
      429,
      "Usage limit reached. Try later or contact your workspace owner.",
    );
}
