import { sql } from "drizzle-orm";
import { db, closeDatabase } from "@/server/database/client";
import {
  reconcileWorkspaceBilling,
  stripeProvider,
} from "@/server/billing/service";

async function main() {
  const provider = stripeProvider();

  const rows = await db().execute<{ organization_id: string }>(
    sql`SELECT organization_id FROM workspace_billing WHERE customer_id IS NOT NULL ORDER BY organization_id`,
  );

  let failed = 0;

  for (const row of rows.rows) {
    try {
      await reconcileWorkspaceBilling(row.organization_id, provider);
    } catch {
      failed++;
      console.error(
        "Billing reconciliation failed for workspace " + row.organization_id,
      );
    }
  }

  console.log(
    "Reconciled " +
      (rows.rowCount! - failed) +
      " workspaces; " +
      failed +
      " failed.",
  );

  if (failed) process.exitCode = 1;
}

main()
  .catch(() => {
    console.error(
      "Billing reconciliation could not run. Check billing configuration and database connectivity.",
    );
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
