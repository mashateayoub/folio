import {
  invitations as invitationTable,
  organizations as organizationTable,
  organizationMembers,
} from "@/server/database/schema";
import { sql, eq, and, getTableColumns } from "drizzle-orm";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { transaction } from "@/server/database/client";
import { type Actor } from "@/server/auth/service";
import { HttpError } from "@/server/http";
import { activeMembership } from "@/features/access-control/policy";
import { config } from "@/server/config";
import { sendMail } from "@/server/mail";
import { billingPlans } from "@/features/billing/plans";
import { orgContext, admin, memberContext } from "@/server/access/context";
import { consume } from "@/server/usage/service";
import { audit } from "@/server/audit/service";

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

    const exists = await client.execute(
      sql`SELECT 1 FROM organization_members m JOIN "user" u ON u.id=m.user_id WHERE m.organization_id=${orgId} AND lower(u.email)=${input.email} AND m.state='active' AND (m.valid_until IS NULL OR m.valid_until>now())`,
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
    await client.execute(
      sql`UPDATE invitations SET state='revoked' WHERE organization_id=${orgId} AND email=${input.email} AND state='pending'`,
    );
    const id = randomUUID();
    await client.execute(
      sql`INSERT INTO invitations(id,organization_id,email,role,token_hash,expires_at,membership_valid_until,created_by) VALUES (${id},${orgId},${input.email},${input.role},${hash(token)},now()+interval '7 days',${
        input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 86400000)
          : null
      },${actor.id})`,
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

export function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function invitation(actor: Actor, token: string, accept = false) {
  return transaction(async (client) => {
    const rows = await client
      .select({
        ...getTableColumns(invitationTable),
        name: organizationTable.name,
      })
      .from(invitationTable)
      .innerJoin(
        organizationTable,
        eq(organizationTable.id, invitationTable.organization_id),
      )
      .where(eq(invitationTable.token_hash, hash(token)));

    const preliminary = rows[0];

    if (!preliminary) throw new HttpError(404, "Invitation not found.");

    // Lock the tenant first, consistently with membership and invitation writes.
    const org = await client.execute(
      sql`SELECT status FROM organizations WHERE id=${preliminary.organization_id} ${sql.raw(accept ? "FOR UPDATE" : "FOR SHARE")}`,
    );

    const fresh = await client
      .select({
        ...getTableColumns(invitationTable),
        name: organizationTable.name,
      })
      .from(invitationTable)
      .innerJoin(
        organizationTable,
        eq(organizationTable.id, invitationTable.organization_id),
      )
      .where(eq(invitationTable.id, preliminary.id));

    const invite = fresh[0];

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
      const current = await client
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organization_id, invite.organization_id),
            eq(organizationMembers.user_id, actor.id),
          ),
        );

      if (activeMembership(memberContext(current[0])))
        throw new HttpError(409, "You are already a workspace member.");

      const seats = await client.execute<{ count: number }>(
        sql`SELECT count(*)::int AS count FROM organization_members WHERE organization_id=${invite.organization_id} AND state='active' AND (valid_until IS NULL OR valid_until>now())`,
      );

      const plan = await client.execute<{ plan: "free" | "team" }>(
        sql`SELECT CASE WHEN plan='team' AND plan_valid_until>now() THEN 'team' ELSE 'free' END AS plan FROM organizations WHERE id=${invite.organization_id}`,
      );

      if (seats.rows[0].count >= billingPlans[plan.rows[0].plan].seats)
        throw new HttpError(429, "This workspace reached its seat limit.");
      await client.execute(
        sql`INSERT INTO organization_members(organization_id,user_id,role,state,valid_until) VALUES (${invite.organization_id},${actor.id},${invite.role},'active',${invite.membership_valid_until}) ON CONFLICT(organization_id,user_id) DO UPDATE SET role=EXCLUDED.role,state='active',valid_until=EXCLUDED.valid_until`,
      );
      await client.execute(
        sql`UPDATE invitations SET state='accepted' WHERE id=${invite.id}`,
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

    const pending = await client.execute(
      sql`SELECT role FROM invitations WHERE id=${id} AND organization_id=${orgId} AND state='pending'`,
    );

    if (!pending.rowCount) throw new HttpError(404, "Invitation not found.");

    if (pending.rows[0].role === "admin" && member.role !== "owner")
      throw new HttpError(
        403,
        "Only the owner can revoke administrator invitations.",
      );
    await client.execute(
      sql`UPDATE invitations SET state='revoked' WHERE id=${id}`,
    );
    await audit(client, actor.id, orgId, "invitation.revoked", id);
  });
}
