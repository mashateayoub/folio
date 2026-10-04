import { randomUUID, randomBytes, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { transaction } from "./db";
import type { Actor } from "./auth";
import { HttpError } from "./http";
import {
  allowed,
  permissions,
  activeMembership,
  type AccessContext,
  type OrgRole,
  type ProjectRole,
  type Action,
} from "../policy";
import { starterProject, createProject, type Project } from "../project";
import type { Organization, CloudProject } from "../saas-types";
import { config } from "./config";
import { sendMail } from "./mail";
import { billingPlans, effectivePlan } from "../billing-plans";

type OrgRow = {
  id: string;
  name: string;
  owner_id: string;
  status: "active" | "suspended";
  plan: "free" | "team";
  plan_valid_until: Date | null;
};

type MemberRow = {
  user_id: string;
  organization_id: string;
  role: OrgRole;
  state: "active" | "revoked";
  valid_until: Date | null;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  owner_id: string;
  data: Project;
  revision: number;
  visibility: "private" | "workspace";
  state: "active" | "archived";
};

function memberContext(
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

export async function audit(
  client: PoolClient,
  actorId: string | null,
  orgId: string,
  action: string,
  resourceId?: string,
  metadata: Record<string, string | number | boolean | null> = {},
) {
  await client.query(
    "INSERT INTO audit_events(id,organization_id,actor_id,action,resource_id,metadata) VALUES ($1,$2,$3,$4,$5,$6)",
    [
      randomUUID(),
      orgId,
      actorId,
      action,
      resourceId || null,
      JSON.stringify(metadata),
    ],
  );
}

export async function orgContext(
  client: PoolClient,
  actor: Actor,
  id: string,
  write = false,
) {
  const orgResult = await client.query<OrgRow>(
    "SELECT * FROM organizations WHERE id=$1 " +
      (write ? "FOR UPDATE" : "FOR SHARE"),
    [id],
  );

  const org = orgResult.rows[0];

  if (!org) throw new HttpError(404, "Workspace not found.");

  const members = await client.query<MemberRow>(
    "SELECT * FROM organization_members WHERE organization_id=$1 AND user_id=$2",
    [id, actor.id],
  );

  const member = members.rows[0];

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

function admin(member: MemberRow) {
  if (!["owner", "admin"].includes(member.role))
    throw new HttpError(403, "Workspace administrator access is required.");
}

async function projectContext(
  client: PoolClient,
  actor: Actor,
  id: string,
  action: Action,
  write = false,
) {
  // The resource selects its tenant. A client-supplied tenant never grants access.
  const found = await client.query<ProjectRow>(
    "SELECT * FROM projects WHERE id=$1",
    [id],
  );

  const preliminary = found.rows[0];

  if (!preliminary) throw new HttpError(404, "Project not found.");

  const { org, member } = await orgContext(
    client,
    actor,
    preliminary.organization_id,
    write,
  );

  const fresh = await client.query<ProjectRow>(
    "SELECT * FROM projects WHERE id=$1",
    [id],
  );

  const project = fresh.rows[0];

  if (!project) throw new HttpError(404, "Project not found.");

  const grants = await client.query<{ role: ProjectRole }>(
    "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
    [id, actor.id],
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
    grant: grants.rows[0]?.role || null,
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

function dto(project: ProjectRow, context: AccessContext): CloudProject {
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

export async function ensurePersonalWorkspace(actor: Actor) {
  return transaction(async (client) => {
    await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [
      actor.id,
    ]);

    const found = await client.query<{ id: string }>(
      "SELECT id FROM organizations WHERE personal_owner_id=$1",
      [actor.id],
    );

    if (found.rowCount) return found.rows[0].id;
    const id = randomUUID();
    await client.query(
      "INSERT INTO organizations(id,name,owner_id,personal_owner_id) VALUES ($1,$2,$3,$3)",
      [id, actor.name.slice(0, 68) + "'s workspace", actor.id],
    );
    await client.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'owner')",
      [id, actor.id],
    );
    const sample = structuredClone(starterProject);
    sample.id = randomUUID();
    await client.query(
      "INSERT INTO projects(id,organization_id,owner_id,data) VALUES ($1,$2,$3,$4)",
      [sample.id, id, actor.id, JSON.stringify(sample)],
    );
    await audit(client, actor.id, id, "workspace.created", id);

    return id;
  });
}

export async function organizations(actor: Actor): Promise<Organization[]> {
  await ensurePersonalWorkspace(actor);

  return transaction(async (client) => {
    const rows = await client.query<Organization>(
      "SELECT o.id,o.name,o.status,CASE WHEN o.plan='team' AND o.plan_valid_until>now() THEN 'team' ELSE 'free' END AS plan,m.role FROM organizations o JOIN organization_members m ON m.organization_id=o.id WHERE m.user_id=$1 AND m.state='active' AND (m.valid_until IS NULL OR m.valid_until>now()) ORDER BY o.created_at",
      [actor.id],
    );

    return rows.rows;
  });
}

export async function createOrganization(actor: Actor, name: string) {
  return transaction(async (client) => {
    await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [
      actor.id,
    ]);

    const count = await client.query(
      "SELECT count(*)::int AS count FROM organizations WHERE owner_id=$1",
      [actor.id],
    );

    if (count.rows[0].count >= 10)
      throw new HttpError(429, "You can own up to 10 workspaces.");
    const id = randomUUID();
    await client.query(
      "INSERT INTO organizations(id,name,owner_id) VALUES ($1,$2,$3)",
      [id, name, actor.id],
    );
    await client.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'owner')",
      [id, actor.id],
    );
    await audit(client, actor.id, id, "workspace.created", id);

    return { id, name, role: "owner", status: "active", plan: "free" };
  });
}

export async function listProjects(
  actor: Actor,
  orgId: string,
): Promise<CloudProject[]> {
  return transaction(async (client) => {
    const { org, member } = await orgContext(client, actor, orgId);

    const rows = await client.query<ProjectRow & { grant: ProjectRole | null }>(
      "SELECT p.*,g.role AS grant FROM projects p LEFT JOIN project_members g ON g.project_id=p.id AND g.user_id=$2 WHERE p.organization_id=$1 ORDER BY p.created_at",
      [orgId, actor.id],
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

    const count = await client.query(
      "SELECT count(*)::int AS count FROM projects WHERE organization_id=$1",
      [orgId],
    );

    if (count.rows[0].count >= billingPlans[org.plan].projects)
      throw new HttpError(429, "This workspace reached its project limit.");

    const project = imported
      ? { ...structuredClone(imported), id: randomUUID() }
      : createProject(template);

    await client.query(
      "INSERT INTO projects(id,organization_id,owner_id,data) VALUES ($1,$2,$3,$4)",
      [project.id, orgId, actor.id, JSON.stringify(project)],
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

    const update = await client.query<ProjectRow>(
      "UPDATE projects SET data=$2,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$3 RETURNING *",
      [id, JSON.stringify(content), expectedRevision],
    );

    if (!update.rowCount)
      throw new HttpError(409, "Project revision conflict.");
    // A save audit contains metadata only, never the source.
    await audit(
      client,
      actor.id,
      project.organization_id,
      "project.saved",
      id,
      { revision: update.rows[0].revision },
    );

    return dto(update.rows[0], context);
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
    await client.query(
      "UPDATE projects SET visibility=COALESCE($2,visibility),state=COALESCE($3,state),revision=revision+1,updated_at=now() WHERE id=$1",
      [id, attributes.visibility || null, attributes.state || null],
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
    await client.query("DELETE FROM projects WHERE id=$1", [id]);
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

    const rows = await client.query(
      'SELECT g.user_id AS "userId",g.role,u.email,u.name FROM project_members g JOIN "user" u ON u.id=g.user_id WHERE g.project_id=$1',
      [id],
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

    const target = await client.query<{ id: string }>(
      "SELECT u.id FROM \"user\" u JOIN organization_members m ON m.user_id=u.id WHERE lower(u.email)=$1 AND m.organization_id=$2 AND m.state='active' AND (m.valid_until IS NULL OR m.valid_until>now())",
      [email.toLowerCase(), project.organization_id],
    );

    if (!target.rowCount)
      throw new HttpError(
        404,
        "Invite this person to the workspace before sharing a project.",
      );

    if (target.rows[0].id === project.owner_id)
      throw new HttpError(400, "The project owner already has full access.");

    if (role)
      await client.query(
        "INSERT INTO project_members(project_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT(project_id,user_id) DO UPDATE SET role=EXCLUDED.role",
        [id, target.rows[0].id, role],
      );
    else
      await client.query(
        "DELETE FROM project_members WHERE project_id=$1 AND user_id=$2",
        [id, target.rows[0].id],
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

export async function organizationDetails(actor: Actor, orgId: string) {
  return transaction(async (client) => {
    const { org, member } = await orgContext(client, actor, orgId);
    admin(member);

    const members = await client.query(
      'SELECT m.user_id AS "userId",m.role,m.state,m.valid_until AS "validUntil",u.email,u.name FROM organization_members m JOIN "user" u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY m.created_at',
      [orgId],
    );

    const invites = await client.query(
      "SELECT id,email,role,state,expires_at AS \"expiresAt\" FROM invitations WHERE organization_id=$1 AND state='pending' AND expires_at>now() ORDER BY created_at DESC",
      [orgId],
    );

    const events = await client.query(
      'SELECT a.id,a.action,a.resource_id AS "resourceId",a.metadata,a.created_at AS "createdAt",u.email AS actor FROM audit_events a LEFT JOIN "user" u ON u.id=a.actor_id WHERE organization_id=$1 ORDER BY a.created_at DESC LIMIT 100',
      [orgId],
    );

    const usage = await client.query(
      "SELECT COALESCE(sum(count),0)::int AS count FROM usage_counters WHERE key=$1",
      ["org-builds:" + orgId + ":" + new Date().toISOString().slice(0, 7)],
    );

    return {
      organization: org,
      members: members.rows,
      invitations: invites.rows,
      events: events.rows,
      usage: usage.rows[0].count,
      compileLimit: billingPlans[org.plan].compiles,
    };
  });
}

export async function changeOrgMember(
  actor: Actor,
  orgId: string,
  userId: string,
  change: { role: "admin" | "member" | "viewer"; state: "active" | "revoked" },
) {
  return transaction(async (client) => {
    const { org, member } = await orgContext(client, actor, orgId, true);
    admin(member);

    const target = await client.query<MemberRow>(
      "SELECT * FROM organization_members WHERE organization_id=$1 AND user_id=$2",
      [orgId, userId],
    );

    if (!target.rowCount) throw new HttpError(404, "Member not found.");

    if (target.rows[0].role === "owner" || org.owner_id === userId)
      throw new HttpError(
        403,
        "The workspace owner cannot be demoted or removed.",
      );

    if (
      member.role !== "owner" &&
      (change.role === "admin" || target.rows[0].role === "admin")
    )
      throw new HttpError(
        403,
        "Only the owner can manage administrator seats.",
      );

    if (
      change.state === "active" &&
      !activeMembership(memberContext(target.rows[0])) &&
      (!target.rows[0].valid_until ||
        target.rows[0].valid_until.getTime() > Date.now())
    ) {
      const seats = await client.query(
        "SELECT count(*)::int AS count FROM organization_members WHERE organization_id=$1 AND state='active' AND (valid_until IS NULL OR valid_until>now())",
        [orgId],
      );

      if (seats.rows[0].count >= billingPlans[org.plan].seats)
        throw new HttpError(429, "This workspace reached its seat limit.");
    }

    await client.query(
      "UPDATE organization_members SET role=$3,state=$4 WHERE organization_id=$1 AND user_id=$2",
      [orgId, userId, change.role, change.state],
    );

    // Grants cannot survive removal and silently reappear on re-invitation.
    if (change.state === "revoked")
      await client.query(
        "DELETE FROM project_members WHERE user_id=$1 AND project_id IN (SELECT id FROM projects WHERE organization_id=$2)",
        [userId, orgId],
      );

    if (change.state === "revoked" || !["owner", "admin"].includes(change.role))
      await client.query(
        "UPDATE invitations SET state='revoked' WHERE organization_id=$1 AND created_by=$2 AND state='pending'",
        [orgId, userId],
      );
    await audit(client, actor.id, orgId, "membership.changed", userId, change);
  });
}

export async function inviteMember(
  actor: Actor,
  orgId: string,
  input: {
    email: string;
    role: "admin" | "member" | "viewer";
    expiresInDays?: number;
  },
) {
  const token = randomBytes(32).toString("hex");

  const invite = await transaction(async (client) => {
    const { org, member } = await orgContext(client, actor, orgId, true);
    admin(member);

    if (input.role === "admin" && member.role !== "owner")
      throw new HttpError(403, "Only the owner can invite administrators.");

    const exists = await client.query(
      "SELECT 1 FROM organization_members m JOIN \"user\" u ON u.id=m.user_id WHERE m.organization_id=$1 AND lower(u.email)=$2 AND m.state='active' AND (m.valid_until IS NULL OR m.valid_until>now())",
      [orgId, input.email],
    );

    if (exists.rowCount)
      throw new HttpError(
        409,
        "This person is already an active workspace member.",
      );
    // Limit repeated sends per workspace, across all application replicas.
    await consume(
      client,
      "invites:" + orgId + ":" + Math.floor(Date.now() / 60_000),
      20,
      120,
    );
    await client.query(
      "UPDATE invitations SET state='revoked' WHERE organization_id=$1 AND email=$2 AND state='pending'",
      [orgId, input.email],
    );
    const id = randomUUID();
    await client.query(
      "INSERT INTO invitations(id,organization_id,email,role,token_hash,expires_at,membership_valid_until,created_by) VALUES ($1,$2,$3,$4,$5,now()+interval '7 days',$6,$7)",
      [
        id,
        orgId,
        input.email,
        input.role,
        hash(token),
        input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 86400000)
          : null,
        actor.id,
      ],
    );
    await audit(client, actor.id, orgId, "invitation.created", id, {
      role: input.role,
    });

    return { id, name: org.name };
  });

  const url = config().APP_URL + "/invite/" + token;

  try {
    await sendMail(
      input.email,
      "Join " + invite.name + " on Folio",
      "You've been invited to " +
        invite.name +
        " as " +
        input.role +
        ".\n\nAccept this invitation with your verified email account:\n" +
        url +
        "\n\nThis link expires in 7 days.",
    );
  } catch {
    throw new HttpError(
      502,
      "The invitation was created, but email delivery failed. Check your email service and send a new invitation.",
    );
  }

  return { id: invite.id };
}

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type InviteRow = {
  id: string;
  organization_id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  state: string;
  expires_at: Date;
  membership_valid_until: Date | null;
  name: string;
};

export async function invitation(actor: Actor, token: string, accept = false) {
  return transaction(async (client) => {
    const rows = await client.query<InviteRow>(
      "SELECT i.*,o.name FROM invitations i JOIN organizations o ON o.id=i.organization_id WHERE token_hash=$1",
      [hash(token)],
    );

    const preliminary = rows.rows[0];

    if (!preliminary) throw new HttpError(404, "Invitation not found.");

    // Lock the tenant first, consistently with membership and invitation writes.
    const org = await client.query(
      "SELECT status FROM organizations WHERE id=$1 " +
        (accept ? "FOR UPDATE" : "FOR SHARE"),
      [preliminary.organization_id],
    );

    const fresh = await client.query<InviteRow>(
      "SELECT i.*,o.name FROM invitations i JOIN organizations o ON o.id=i.organization_id WHERE i.id=$1",
      [preliminary.id],
    );

    const invite = fresh.rows[0];

    if (
      !invite ||
      invite.state !== "pending" ||
      invite.expires_at.getTime() <= Date.now() ||
      (invite.membership_valid_until &&
        invite.membership_valid_until.getTime() <= Date.now())
    )
      throw new HttpError(410, "This invitation has expired or was revoked.");

    if (
      !actor.emailVerified ||
      actor.email.toLowerCase() !== invite.email.toLowerCase()
    )
      throw new HttpError(
        403,
        "Sign in with the verified email address that received this invitation.",
      );

    if (org.rows[0].status !== "active")
      throw new HttpError(403, "This workspace is suspended.");

    if (accept) {
      const current = await client.query<MemberRow>(
        "SELECT * FROM organization_members WHERE organization_id=$1 AND user_id=$2",
        [invite.organization_id, actor.id],
      );

      if (activeMembership(memberContext(current.rows[0])))
        throw new HttpError(409, "You are already a workspace member.");

      const seats = await client.query(
        "SELECT count(*)::int AS count FROM organization_members WHERE organization_id=$1 AND state='active' AND (valid_until IS NULL OR valid_until>now())",
        [invite.organization_id],
      );

      const plan = await client.query<{ plan: "free" | "team" }>(
        "SELECT CASE WHEN plan='team' AND plan_valid_until>now() THEN 'team' ELSE 'free' END AS plan FROM organizations WHERE id=$1",
        [invite.organization_id],
      );

      if (seats.rows[0].count >= billingPlans[plan.rows[0].plan].seats)
        throw new HttpError(429, "This workspace reached its seat limit.");
      await client.query(
        "INSERT INTO organization_members(organization_id,user_id,role,state,valid_until) VALUES ($1,$2,$3,'active',$4) ON CONFLICT(organization_id,user_id) DO UPDATE SET role=EXCLUDED.role,state='active',valid_until=EXCLUDED.valid_until",
        [
          invite.organization_id,
          actor.id,
          invite.role,
          invite.membership_valid_until,
        ],
      );
      await client.query(
        "UPDATE invitations SET state='accepted' WHERE id=$1",
        [invite.id],
      );
      await audit(
        client,
        actor.id,
        invite.organization_id,
        "invitation.accepted",
        invite.id,
      );
    }

    return {
      id: invite.id,
      organizationId: invite.organization_id,
      name: invite.name,
      email: invite.email,
      role: invite.role,
    };
  });
}

export async function revokeInvitation(
  actor: Actor,
  orgId: string,
  id: string,
) {
  return transaction(async (client) => {
    const { member } = await orgContext(client, actor, orgId, true);
    admin(member);

    const pending = await client.query(
      "SELECT role FROM invitations WHERE id=$1 AND organization_id=$2 AND state='pending'",
      [id, orgId],
    );

    if (!pending.rowCount) throw new HttpError(404, "Invitation not found.");

    if (pending.rows[0].role === "admin" && member.role !== "owner")
      throw new HttpError(
        403,
        "Only the owner can revoke administrator invitations.",
      );
    await client.query("UPDATE invitations SET state='revoked' WHERE id=$1", [
      id,
    ]);
    await audit(client, actor.id, orgId, "invitation.revoked", id);
  });
}

async function consume(
  client: PoolClient,
  key: string,
  limit: number,
  ttlSeconds: number,
) {
  const result = await client.query(
    "INSERT INTO usage_counters(key,count,expires_at) VALUES ($1,1,now()+$3*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=usage_counters.count+1 WHERE usage_counters.count<$2 RETURNING count",
    [key, limit, ttlSeconds],
  );

  if (!result.rowCount)
    throw new HttpError(
      429,
      "Usage limit reached. Try later or contact your workspace owner.",
    );
}

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

    const running = await client.query(
      "SELECT 1 FROM builds WHERE project_id=$1 AND status='running' AND created_at>now()-interval '60 seconds'",
      [projectId],
    );

    if (running.rowCount)
      throw new HttpError(429, "This project already has a running build.");
    await client.query(
      "UPDATE builds SET status='failed',snapshot=NULL,finished_at=now(),log='Worker did not complete this build.' WHERE project_id=$1 AND status='running' AND created_at<=now()-interval '60 seconds'",
      [projectId],
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
    await client.query(
      "INSERT INTO builds(id,organization_id,project_id,actor_id,revision,snapshot,status) VALUES ($1,$2,$3,$4,$5,$6,'running')",
      [id, org.id, projectId, actor.id, revision, JSON.stringify(project.data)],
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
    const row = await client.query<{ project_id: string }>(
      "UPDATE builds SET status=$2,pdf=$3,log=$4,snapshot=NULL,finished_at=now() WHERE id=$1 AND status='running' RETURNING project_id",
      [id, pdf ? "succeeded" : "failed", pdf, log.slice(-64000)],
    );

    if (!row.rowCount) return;
    // Keep the latest three successful PDFs and the latest ten diagnostic records.
    await client.query(
      "UPDATE builds SET pdf=NULL WHERE project_id=$1 AND id NOT IN (SELECT id FROM builds WHERE project_id=$1 AND pdf IS NOT NULL ORDER BY created_at DESC LIMIT 3)",
      [row.rows[0].project_id],
    );
    await client.query(
      "DELETE FROM builds WHERE project_id=$1 AND status<>'running' AND pdf IS NULL AND id NOT IN (SELECT id FROM builds WHERE project_id=$1 ORDER BY created_at DESC LIMIT 10)",
      [row.rows[0].project_id],
    );
    await client.query("DELETE FROM usage_counters WHERE expires_at<now()");
  });
}

export async function latestBuild(actor: Actor, projectId: string) {
  return transaction(async (client) => {
    await projectContext(client, actor, projectId, "read");

    const result = await client.query(
      'SELECT id,revision,status,log,created_at AS "createdAt",pdf IS NOT NULL AS "hasPdf" FROM builds WHERE project_id=$1 ORDER BY created_at DESC LIMIT 10',
      [projectId],
    );

    return result.rows;
  });
}

export async function artifact(actor: Actor, buildId: string) {
  return transaction(async (client) => {
    const found = await client.query<{ project_id: string }>(
      "SELECT project_id FROM builds WHERE id=$1",
      [buildId],
    );

    if (!found.rowCount) throw new HttpError(404, "Build not found.");
    await projectContext(client, actor, found.rows[0].project_id, "read");

    const result = await client.query<{ pdf: Buffer | null }>(
      "SELECT pdf FROM builds WHERE id=$1",
      [buildId],
    );

    if (!result.rows[0]?.pdf) throw new HttpError(404, "PDF not found.");

    return result.rows[0].pdf;
  });
}
