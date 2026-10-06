import { eq, and } from "drizzle-orm";
import {
  organizations as organizationTable,
  organizationMembers,
  projects as projectTable,
  projectMembers,
} from "@/server/database/schema/index";
import { type DatabaseTransaction } from "@/server/database/client";
import { type Actor } from "@/server/auth/service";
import { HttpError } from "@/server/http";
import {
  allowed,
  permissions,
  activeMembership,
  type AccessContext,
  type Action,
} from "@/features/access-control/policy";
import { type CloudProject } from "@/shared/types/saas";
import { effectivePlan } from "@/features/billing/plans";

export type OrgRow = typeof organizationTable.$inferSelect;

export type MemberRow = typeof organizationMembers.$inferSelect;

export type ProjectRow = typeof projectTable.$inferSelect;

export function memberContext(
  member: MemberRow | undefined,
): AccessContext["membership"] {
  return member
    ? {
        userId: member.user_id,
        organizationId: member.organization_id,
        role: member.role,
        state: member.state,
        validUntil: member.valid_until,
      }
    : null;
}

export async function orgContext(
  client: DatabaseTransaction,
  actor: Actor,
  id: string,
  write = false,
) {
  const orgResult = await client
    .select()
    .from(organizationTable)
    .where(eq(organizationTable.id, id))
    .for(write ? "update" : "share");

  const org = orgResult[0];

  if (!org) throw new HttpError(404, "Workspace not found.");

  const members = await client
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organization_id, id),
        eq(organizationMembers.user_id, actor.id),
      ),
    );

  const member = members[0];

  if (
    !actor.emailVerified ||
    actor.disabled ||
    !activeMembership(memberContext(member))
  )
    throw new HttpError(404, "Workspace not found.");

  if (org.status !== "active")
    throw new HttpError(403, "This workspace is suspended.");
  org.plan = effectivePlan(org.plan, org.plan_valid_until);

  return { org, member };
}

export function admin(member: MemberRow) {
  if (!["owner", "admin"].includes(member.role))
    throw new HttpError(403, "Workspace administrator access is required.");
}

export async function projectContext(
  client: DatabaseTransaction,
  actor: Actor,
  id: string,
  action: Action,
  write = false,
) {
  // The resource selects its tenant. A client-supplied tenant never grants access.
  const found = await client
    .select()
    .from(projectTable)
    .where(eq(projectTable.id, id));

  const preliminary = found[0];

  if (!preliminary) throw new HttpError(404, "Project not found.");

  const { org, member } = await orgContext(
    client,
    actor,
    preliminary.organization_id,
    write,
  );

  const fresh = await client
    .select()
    .from(projectTable)
    .where(eq(projectTable.id, id));

  const project = fresh[0];

  if (!project) throw new HttpError(404, "Project not found.");

  const grants = await client
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.project_id, id),
        eq(projectMembers.user_id, actor.id),
      ),
    );

  const context: AccessContext = {
    actor,
    organization: org,
    membership: memberContext(member),
    project: {
      organizationId: project.organization_id,
      ownerId: project.owner_id,
      visibility: project.visibility,
      state: project.state,
    },
    grant: grants[0]?.role || null,
  };

  if (!allowed(context, "read")) throw new HttpError(404, "Project not found.");

  if (!allowed(context, action))
    throw new HttpError(
      403,
      project.state === "archived"
        ? "Archived projects are read-only."
        : "You do not have permission for this action.",
    );

  return { project, org, context };
}

export function dto(project: ProjectRow, context: AccessContext): CloudProject {
  return {
    ...project.data,
    revision: project.revision,
    organizationId: project.organization_id,
    ownerId: project.owner_id,
    visibility: project.visibility,
    state: project.state,
    permissions: permissions(context),
  };
}
