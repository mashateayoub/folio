import { auditEvents } from "@/server/database/schema/index";
import { randomUUID } from "node:crypto";
import { type DatabaseTransaction } from "@/server/database/client";

export async function audit(
  client: DatabaseTransaction,
  actorId: string | null,
  orgId: string,
  action: string,
  resourceId?: string,
  metadata: Record<string, string | number | boolean | null> = {},
) {
  await client.insert(auditEvents).values({
    id: randomUUID(),
    organization_id: orgId,
    actor_id: actorId,
    action,
    resource_id: resourceId || null,
    metadata,
  });
}
