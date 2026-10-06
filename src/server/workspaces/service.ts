import { organizationMembers } from "@/server/database/schema";
import { sql, eq, and } from "drizzle-orm";
import { projects as projectTable } from "@/server/database/schema/index";
import { randomUUID } from "node:crypto";
import { transaction } from "@/server/database/client";
import { type Actor } from "@/server/auth/service";
import { HttpError } from "@/server/http";
import { activeMembership } from "@/features/access-control/policy";
import { starterProject } from "@/features/projects/model";
import { type Organization } from "@/shared/types/saas";
import { billingPlans } from "@/features/billing/plans";
import { audit } from "@/server/audit/service";
import { orgContext, admin, memberContext } from "@/server/access/context";

export async function ensurePersonalWorkspace(actor: Actor) {
  return transaction(async (client) => {
    await client.execute(
      sql`SELECT id FROM "user" WHERE id=${actor.id} FOR UPDATE`,
    );

    const found = await client.execute<{ id: string }>(
      sql`SELECT id FROM organizations WHERE personal_owner_id=${actor.id}`,
    );

    if (found.rowCount) return found.rows[0].id;
    const id = randomUUID();
    await client.execute(
      sql`INSERT INTO organizations(id,name,owner_id,personal_owner_id) VALUES (${id},${actor.name.slice(0, 68) + "'s workspace"},${actor.id},${actor.id})`,
    );
    await client.execute(
      sql`INSERT INTO organization_members(organization_id,user_id,role) VALUES (${id},${actor.id},'owner')`,
    );
    const sample = structuredClone(starterProject);
    sample.id = randomUUID();
    await client.insert(projectTable).values({
      id: sample.id,
      organization_id: id,
      owner_id: actor.id,
      data: sample,
    });
    await audit(client, actor.id, id, "workspace.created", id);

    return id;
  });
}

export async function organizations(actor: Actor): Promise<Organization[]> {
  await ensurePersonalWorkspace(actor);

  return transaction(async (client) => {
    const rows = await client.execute<Organization>(
      sql`SELECT o.id,o.name,o.status,CASE WHEN o.plan='team' AND o.plan_valid_until>now() THEN 'team' ELSE 'free' END AS plan,m.role FROM organizations o JOIN organization_members m ON m.organization_id=o.id WHERE m.user_id=${actor.id} AND m.state='active' AND (m.valid_until IS NULL OR m.valid_until>now()) ORDER BY o.created_at`,
    );

    return rows.rows;
  });
}

export async function createOrganization(actor: Actor, name: string) {
  return transaction(async (client) => {
    await client.execute(
      sql`SELECT id FROM "user" WHERE id=${actor.id} FOR UPDATE`,
    );

    const count = await client.execute<{ count: number }>(
      sql`SELECT count(*)::int AS count FROM organizations WHERE owner_id=${actor.id}`,
    );

    if (count.rows[0].count >= 10)
      throw new HttpError(429, "You can own up to 10 workspaces.");
    const id = randomUUID();
    await client.execute(
      sql`INSERT INTO organizations(id,name,owner_id) VALUES (${id},${name},${actor.id})`,
    );
    await client.execute(
      sql`INSERT INTO organization_members(organization_id,user_id,role) VALUES (${id},${actor.id},'owner')`,
    );
    await audit(client, actor.id, id, "workspace.created", id);

    return { id, name, role: "owner", status: "active", plan: "free" };
  });
}

export async function organizationDetails(actor: Actor, orgId: string) {
  return transaction(async (client) => {
    const { org, member } = await orgContext(client, actor, orgId);
    admin(member);

    const members = await client.execute(
      sql`SELECT m.user_id AS "userId",m.role,m.state,m.valid_until AS "validUntil",u.email,u.name FROM organization_members m JOIN "user" u ON u.id=m.user_id WHERE m.organization_id=${orgId} ORDER BY m.created_at`,
    );

    const invites = await client.execute(
      sql`SELECT id,email,role,state,expires_at AS "expiresAt" FROM invitations WHERE organization_id=${orgId} AND state='pending' AND expires_at>now() ORDER BY created_at DESC`,
    );

    const events = await client.execute(
      sql`SELECT a.id,a.action,a.resource_id AS "resourceId",a.metadata,a.created_at AS "createdAt",u.email AS actor FROM audit_events a LEFT JOIN "user" u ON u.id=a.actor_id WHERE organization_id=${orgId} ORDER BY a.created_at DESC LIMIT 100`,
    );

    const usage = await client.execute(
      sql`SELECT COALESCE(sum(count),0)::int AS count FROM usage_counters WHERE key=${"org-builds:" + orgId + ":" + new Date().toISOString().slice(0, 7)}`,
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

    const target = await client
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organization_id, orgId),
          eq(organizationMembers.user_id, userId),
        ),
      );

    if (!target.length) throw new HttpError(404, "Member not found.");

    if (target[0].role === "owner" || org.owner_id === userId)
      throw new HttpError(
        403,
        "The workspace owner cannot be demoted or removed.",
      );

    if (
      member.role !== "owner" &&
      (change.role === "admin" || target[0].role === "admin")
    )
      throw new HttpError(
        403,
        "Only the owner can manage administrator seats.",
      );

    if (
      change.state === "active" &&
      !activeMembership(memberContext(target[0])) &&
      (!target[0].valid_until || target[0].valid_until.getTime() > Date.now())
    ) {
      const seats = await client.execute<{ count: number }>(
        sql`SELECT count(*)::int AS count FROM organization_members WHERE organization_id=${orgId} AND state='active' AND (valid_until IS NULL OR valid_until>now())`,
      );

      if (seats.rows[0].count >= billingPlans[org.plan].seats)
        throw new HttpError(429, "This workspace reached its seat limit.");
    }

    await client.execute(
      sql`UPDATE organization_members SET role=${change.role},state=${change.state} WHERE organization_id=${orgId} AND user_id=${userId}`,
    );

    // Grants cannot survive removal and silently reappear on re-invitation.
    if (change.state === "revoked")
      await client.execute(
        sql`DELETE FROM project_members WHERE user_id=${userId} AND project_id IN (SELECT id FROM projects WHERE organization_id=${orgId})`,
      );

    if (change.state === "revoked" || !["owner", "admin"].includes(change.role))
      await client.execute(
        sql`UPDATE invitations SET state='revoked' WHERE organization_id=${orgId} AND created_by=${userId} AND state='pending'`,
      );
    await audit(client, actor.id, orgId, "membership.changed", userId, change);
  });
}
