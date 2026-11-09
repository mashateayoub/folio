import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { transaction } from "@/server/database/client";
import { type Actor } from "@/server/auth/service";
import { HttpError } from "@/server/http";
import { billingPlans } from "@/features/billing/plans";
import { projectContext } from "@/server/access/context";
import { consume } from "@/server/usage/service";
import { audit } from "@/server/audit/service";

export async function beginBuild(
  actor: Actor,
  projectId: string,
  revision: number,
) {
  return transaction(async (client) => {
    const { project, org } = await projectContext(
      client,
      actor,
      projectId,
      "compile",
      true,
    );

    if (project.revision !== revision)
      throw new HttpError(409, "Save your latest edits before compiling.");

    const running = await client.execute(
      sql`SELECT 1 FROM builds WHERE project_id=${projectId} AND status='running' AND created_at>now()-interval '60 seconds'`,
    );

    if (running.rowCount)
      throw new HttpError(429, "This project already has a running build.");
    await client.execute(
      sql`UPDATE builds SET status='failed',snapshot=NULL,finished_at=now(),log='Worker did not complete this build.' WHERE project_id=${projectId} AND status='running' AND created_at<=now()-interval '60 seconds'`,
    );
    await consume(
      client,
      "user-builds:" + actor.id + ":" + Math.floor(Date.now() / 60_000),
      30,
      120,
    );
    await consume(
      client,
      "org-builds:" + org.id + ":" + new Date().toISOString().slice(0, 7),
      billingPlans[org.plan].compiles,
      35 * 86400,
    );
    const id = randomUUID();
    await client.execute(
      sql`INSERT INTO builds(id,organization_id,project_id,actor_id,revision,snapshot,status) VALUES (${id},${org.id},${projectId},${actor.id},${revision},${JSON.stringify(project.data)},'running')`,
    );
    await audit(client, actor.id, org.id, "build.requested", id, {
      projectId,
      revision,
    });

    return { id, project: project.data, revision };
  });
}

export async function finishBuild(id: string, pdf: Buffer | null, log: string) {
  return transaction(async (client) => {
    const row = await client.execute<{ project_id: string }>(
      sql`UPDATE builds SET status=${pdf ? "succeeded" : "failed"},pdf=${pdf},log=${log},snapshot=NULL,finished_at=now() WHERE id=${id} AND status='running' RETURNING project_id`,
    );

    if (!row.rowCount) return;
    // Keep the latest three successful PDFs and the latest ten diagnostic records.
    await client.execute(
      sql`UPDATE builds SET pdf=NULL WHERE project_id=${row.rows[0].project_id} AND id NOT IN (SELECT id FROM builds WHERE project_id=${row.rows[0].project_id} AND pdf IS NOT NULL ORDER BY created_at DESC LIMIT 3)`,
    );
    await client.execute(
      sql`DELETE FROM builds WHERE project_id=${row.rows[0].project_id} AND status<>'running' AND pdf IS NULL AND id NOT IN (SELECT id FROM builds WHERE project_id=${row.rows[0].project_id} ORDER BY created_at DESC LIMIT 10)`,
    );
    await client.execute(
      sql`DELETE FROM usage_counters WHERE expires_at<now()`,
    );
  });
}

export async function latestBuild(actor: Actor, projectId: string) {
  return transaction(async (client) => {
    await projectContext(client, actor, projectId, "read");

    const result = await client.execute(
      sql`SELECT id,revision,status,log,created_at AS "createdAt",pdf IS NOT NULL AS "hasPdf" FROM builds WHERE project_id=${projectId} ORDER BY created_at DESC LIMIT 10`,
    );

    return result.rows;
  });
}

export async function artifact(actor: Actor, buildId: string) {
  return transaction(async (client) => {
    const found = await client.execute<{ project_id: string }>(
      sql`SELECT project_id FROM builds WHERE id=${buildId}`,
    );

    if (!found.rowCount) throw new HttpError(404, "Build not found.");
    await projectContext(client, actor, found.rows[0].project_id, "read");

    const result = await client.execute<{ pdf: Buffer | null }>(
      sql`SELECT pdf FROM builds WHERE id=${buildId}`,
    );

    if (!result.rows[0]?.pdf) throw new HttpError(404, "PDF not found.");

    return result.rows[0].pdf;
  });
}
