import { sql, eq, and } from "drizzle-orm";
import { projects as projectTable } from "@/server/database/schema/index";
import { randomUUID } from "node:crypto";
import { transaction } from "@/server/database/client";
import { type Actor } from "@/server/auth/service";
import { HttpError } from "@/server/http";
import {
  allowed,
  type AccessContext,
  type ProjectRole,
} from "@/features/access-control/policy";
import { createProject, type Project } from "@/features/projects/model";
import { type CloudProject } from "@/shared/types/saas";
import { billingPlans } from "@/features/billing/plans";
import {
  orgContext,
  ProjectRow,
  memberContext,
  dto,
  projectContext,
} from "@/server/access/context";
import { audit } from "@/server/audit/service";

export async function listProjects(
  actor: Actor,
  orgId: string,
): Promise<CloudProject[]> {
  return transaction(async (client) => {
    const { org, member } = await orgContext(client, actor, orgId);

    const rows = await client.execute<
      ProjectRow & { grant: ProjectRole | null }
    >(
      sql`SELECT p.*,g.role AS grant FROM projects p LEFT JOIN project_members g ON g.project_id=p.id AND g.user_id=${actor.id} WHERE p.organization_id=${orgId} ORDER BY p.created_at`,
    );

    return rows.rows.flatMap((project) => {
      const context: AccessContext = {
        actor,
        organization: org,
        membership: memberContext(member),
        project: {
          organizationId: orgId,
          ownerId: project.owner_id,
          visibility: project.visibility,
          state: project.state,
        },
        grant: project.grant,
      };

      return allowed(context, "read") ? [dto(project, context)] : [];
    });
  });
}

export async function createCloudProject(
  actor: Actor,
  orgId: string,
  template: "article" | "blank" | "report",
  imported?: Project,
) {
  return transaction(async (client) => {
    const { org, member } = await orgContext(client, actor, orgId, true);

    if (member.role === "viewer")
      throw new HttpError(403, "Viewer seats cannot create projects.");

    const count = await client.execute<{ count: number }>(
      sql`SELECT count(*)::int AS count FROM projects WHERE organization_id=${orgId}`,
    );

    if (count.rows[0].count >= billingPlans[org.plan].projects)
      throw new HttpError(429, "This workspace reached its project limit.");

    const project = imported
      ? { ...structuredClone(imported), id: randomUUID() }
      : createProject(template);

    await client.execute(
      sql`INSERT INTO projects(id,organization_id,owner_id,data) VALUES (${project.id},${orgId},${actor.id},${JSON.stringify(project)})`,
    );
    await audit(client, actor.id, orgId, "project.created", project.id);

    const { project: stored, context } = await projectContext(
      client,
      actor,
      project.id,
      "read",
    );

    return dto(stored, context);
  });
}

export async function getProject(actor: Actor, id: string) {
  return transaction(async (client) => {
    const { project, context } = await projectContext(
      client,
      actor,
      id,
      "read",
    );

    return dto(project, context);
  });
}

export async function saveProject(
  actor: Actor,
  id: string,
  content: Project,
  expectedRevision: number,
) {
  if (content.id !== id)
    throw new HttpError(400, "Project identifiers do not match.");

  return transaction(async (client) => {
    const { project, context } = await projectContext(
      client,
      actor,
      id,
      "write",
      true,
    );

    if (project.revision !== expectedRevision)
      throw new HttpError(
        409,
        "This project changed in another session. Reload before editing further.",
      );

    const update = await client
      .update(projectTable)
      .set({
        data: content,
        revision: sql`${projectTable.revision} + 1`,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(projectTable.id, id),
          eq(projectTable.revision, expectedRevision),
        ),
      )
      .returning();

    if (!update.length) throw new HttpError(409, "Project revision conflict.");
    // A save audit contains metadata only, never the source.
    await audit(
      client,
      actor.id,
      project.organization_id,
      "project.saved",
      id,
      { revision: update[0].revision },
    );

    return dto(update[0], context);
  });
}

export async function setProjectAttributes(
  actor: Actor,
  id: string,
  attributes: {
    visibility?: "private" | "workspace";
    state?: "active" | "archived";
  },
) {
  return transaction(async (client) => {
    const { project } = await projectContext(client, actor, id, "manage", true);
    await client.execute(
      sql`UPDATE projects SET visibility=COALESCE(${attributes.visibility || null},visibility),state=COALESCE(${attributes.state || null},state),revision=revision+1,updated_at=now() WHERE id=${id}`,
    );
    await audit(
      client,
      actor.id,
      project.organization_id,
      "project.attributes.changed",
      id,
      attributes,
    );
    const result = await projectContext(client, actor, id, "read");

    return dto(result.project, result.context);
  });
}

export async function deleteProject(actor: Actor, id: string) {
  return transaction(async (client) => {
    const { project } = await projectContext(client, actor, id, "delete", true);
    await client.delete(projectTable).where(eq(projectTable.id, id));
    await audit(
      client,
      actor.id,
      project.organization_id,
      "project.deleted",
      id,
    );
  });
}

export async function projectGrants(actor: Actor, id: string) {
  return transaction(async (client) => {
    await projectContext(client, actor, id, "manage");

    const rows = await client.execute(
      sql`SELECT g.user_id AS "userId",g.role,u.email,u.name FROM project_members g JOIN "user" u ON u.id=g.user_id WHERE g.project_id=${id}`,
    );

    return rows.rows;
  });
}

export async function setProjectGrant(
  actor: Actor,
  id: string,
  email: string,
  role: ProjectRole | null,
) {
  return transaction(async (client) => {
    const { project } = await projectContext(client, actor, id, "manage", true);

    const target = await client.execute<{ id: string }>(
      sql`SELECT u.id FROM "user" u JOIN organization_members m ON m.user_id=u.id WHERE lower(u.email)=${email.toLowerCase()} AND m.organization_id=${project.organization_id} AND m.state='active' AND (m.valid_until IS NULL OR m.valid_until>now())`,
    );

    if (!target.rowCount)
      throw new HttpError(
        404,
        "Invite this person to the workspace before sharing a project.",
      );

    if (target.rows[0].id === project.owner_id)
      throw new HttpError(400, "The project owner already has full access.");

    if (role)
      await client.execute(
        sql`INSERT INTO project_members(project_id,user_id,role) VALUES (${id},${target.rows[0].id},${role}) ON CONFLICT(project_id,user_id) DO UPDATE SET role=EXCLUDED.role`,
      );
    else
      await client.execute(
        sql`DELETE FROM project_members WHERE project_id=${id} AND user_id=${target.rows[0].id}`,
      );
    await audit(
      client,
      actor.id,
      project.organization_id,
      "project.access.changed",
      id,
      { userId: target.rows[0].id, role },
    );
  });
}
