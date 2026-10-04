import { db } from "../src/lib/server/db";
import {
  reconcileWorkspaceBilling,
  stripeProvider,
} from "../src/lib/server/billing";

async function main() {
  const provider = stripeProvider();

  const rows = await db().query<{ organization_id: string }>(
    "SELECT organization_id FROM workspace_billing WHERE customer_id IS NOT NULL ORDER BY organization_id",
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
  .finally(() => db().end());
