import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { request, type APIRequestContext } from "@playwright/test";
import { Pool } from "pg";

const baseURL = process.env.SAAS_TEST_URL || "http://127.0.0.1:3001";

import { emailLink } from "./mail-helper";

const password = "Acceptance-password-2026!";

function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";

  for (const c of secret.replace(/=/g, ""))
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const time = Buffer.alloc(8);
  time.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(time).digest();
  const offset = digest[digest.length - 1] & 15;

  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}

test(
  "SaaS: verified auth, tenant isolation, roles, attributes, invitations, PDF access, recovery and MFA",
  { timeout: 180000 },
  async () => {
    const db = new Pool({ connectionString: process.env.DATABASE_URL });
    const contexts: APIRequestContext[] = [];

    const users: { id: string; email: string; client: APIRequestContext }[] =
      [];

    const stamp = randomUUID();

    async function client() {
      const c = await request.newContext({
        baseURL,
        extraHTTPHeaders: { Origin: baseURL },
      });

      contexts.push(c);

      return c;
    }

    async function call(
      c: APIRequestContext,
      method: string,
      path: string,
      data?: NonNullable<Parameters<APIRequestContext["fetch"]>[1]>["data"],
      status = 200,
    ) {
      const response = await c.fetch(path, { method, data });
      assert.equal(
        response.status(),
        status,
        method +
          " " +
          path +
          ": " +
          (response.status() === status ? "" : await response.text()),
      );

      return response;
    }

    try {
      for (const [index, name] of ["Owner", "Member", "Outsider"].entries()) {
        const c = await client();
        const email = `saas-${stamp}-${index}@example.test`;

        const signup = await call(c, "POST", "/api/auth/sign-up/email", {
          name,
          email,
          password,
          disabled: false,
          role: "owner",
          callbackURL: "/sign-in",
        });

        const body = await signup.json();
        assert.equal(
          (await c.get("/api/organizations")).status(),
          401,
          "unverified signup must not get a session",
        );

        if (index === 0)
          await call(
            c,
            "POST",
            "/api/auth/sign-in/email",
            { email, password },
            403,
          );
        const link = await emailLink(email, "Verify");
        await c.get(link);
        await call(c, "POST", "/api/auth/sign-in/email", { email, password });
        users.push({ id: body.user.id, email, client: c });
      }

      const [owner, member, outsider] = users;
      const anonymous = await client();
      await call(anonymous, "GET", "/api/organizations", undefined, 401);

      const orgs = await (
        await call(owner.client, "GET", "/api/organizations")
      ).json();

      const org = orgs[0];

      const projects = await (
        await call(
          owner.client,
          "GET",
          "/api/projects?organizationId=" + org.id,
        )
      ).json();

      let project = projects[0];
      await call(
        outsider.client,
        "GET",
        "/api/projects/" + project.id,
        undefined,
        404,
      );
      await call(
        outsider.client,
        "GET",
        "/api/projects?organizationId=" + org.id,
        undefined,
        404,
      );
      await call(
        owner.client,
        "POST",
        "/api/organizations",
        { name: "Forged", plan: "team" },
        400,
      );

      const invite = await (
        await call(
          owner.client,
          "POST",
          `/api/organizations/${org.id}/invitations`,
          { email: member.email, role: "member", expiresInDays: 7 },
          201,
        )
      ).json();

      assert.ok(invite.id);
      assert.equal(invite.token, undefined);

      const token = new URL(await emailLink(member.email, "Join")).pathname
        .split("/")
        .pop()!;

      await call(outsider.client, "POST", "/api/invitations/" + token, {}, 403);
      await call(member.client, "POST", "/api/invitations/" + token, {});
      await call(member.client, "POST", "/api/invitations/" + token, {}, 410);
      await call(
        member.client,
        "GET",
        "/api/projects/" + project.id,
        undefined,
        404,
      );
      await call(
        member.client,
        "GET",
        "/api/organizations/" + org.id,
        undefined,
        403,
      );
      await call(
        member.client,
        "PATCH",
        `/api/organizations/${org.id}/members/${member.id}`,
        { role: "admin", state: "active" },
        403,
      );
      project = await (
        await call(
          owner.client,
          "PATCH",
          `/api/projects/${project.id}/settings`,
          { visibility: "workspace" },
        )
      ).json();

      const payload = () => ({
        project: {
          id: project.id,
          title: project.title,
          rootFile: project.rootFile,
          files: project.files,
        },
        expectedRevision: project.revision,
      });

      await call(member.client, "GET", "/api/projects/" + project.id);
      await call(
        member.client,
        "PUT",
        "/api/projects/" + project.id,
        payload(),
        403,
      );
      await call(owner.client, "PUT", `/api/projects/${project.id}/members`, {
        email: member.email,
        role: "editor",
      });
      project = await (
        await call(
          member.client,
          "PUT",
          "/api/projects/" + project.id,
          payload(),
        )
      ).json();
      await call(
        owner.client,
        "PUT",
        "/api/projects/" + project.id,
        { ...payload(), expectedRevision: project.revision - 1 },
        409,
      );
      await call(
        owner.client,
        "PUT",
        "/api/projects/" + project.id,
        { ...payload(), organizationId: randomUUID() },
        400,
      );
      await call(
        owner.client,
        "PATCH",
        `/api/organizations/${org.id}/members/${member.id}`,
        { role: "viewer", state: "active" },
      );
      await call(
        member.client,
        "PUT",
        "/api/projects/" + project.id,
        payload(),
        403,
      );
      await call(
        member.client,
        "POST",
        "/api/compile",
        { projectId: project.id, revision: project.revision },
        403,
      );
      await call(
        member.client,
        "POST",
        "/api/projects",
        { organizationId: org.id, template: "blank" },
        403,
      );
      project = await (
        await call(
          owner.client,
          "PATCH",
          `/api/projects/${project.id}/settings`,
          { state: "archived" },
        )
      ).json();
      await call(
        owner.client,
        "PUT",
        "/api/projects/" + project.id,
        payload(),
        403,
      );
      await call(
        owner.client,
        "POST",
        "/api/compile",
        { projectId: project.id, revision: project.revision },
        403,
      );
      project = await (
        await call(
          owner.client,
          "PATCH",
          `/api/projects/${project.id}/settings`,
          { state: "active" },
        )
      ).json();

      const built = await (
        await call(owner.client, "POST", "/api/compile", {
          projectId: project.id,
          revision: project.revision,
        })
      ).json();

      const pdf = await call(member.client, "GET", built.pdfUrl);
      assert.equal((await pdf.body()).subarray(0, 5).toString(), "%PDF-");
      assert.equal(pdf.headers()["cache-control"].includes("no-store"), true);
      await call(outsider.client, "GET", built.pdfUrl, undefined, 404);
      await call(
        owner.client,
        "PATCH",
        `/api/organizations/${org.id}/members/${member.id}`,
        { role: "member", state: "revoked" },
      );
      await call(member.client, "GET", built.pdfUrl, undefined, 404);
      await call(
        owner.client,
        "PATCH",
        `/api/organizations/${org.id}/members/${member.id}`,
        { role: "member", state: "active" },
      );

      const restored = await (
        await call(member.client, "GET", "/api/projects/" + project.id)
      ).json();

      assert.equal(
        restored.permissions.write,
        false,
        "revoking membership destroys old editor grants",
      );
      await db.query(
        "UPDATE organization_members SET valid_until=now()-interval '1 second' WHERE organization_id=$1 AND user_id=$2",
        [org.id, member.id],
      );
      await call(member.client, "GET", built.pdfUrl, undefined, 404);
      await db.query(
        "UPDATE organizations SET status='suspended' WHERE id=$1",
        [org.id],
      );
      await call(owner.client, "GET", built.pdfUrl, undefined, 403);
      await db.query("UPDATE organizations SET status='active' WHERE id=$1", [
        org.id,
      ]);

      const key =
        "org-builds:" + org.id + ":" + new Date().toISOString().slice(0, 7);

      await db.query("UPDATE usage_counters SET count=1000 WHERE key=$1", [
        key,
      ]);
      await call(
        owner.client,
        "POST",
        "/api/compile",
        { projectId: project.id, revision: project.revision },
        429,
      );
      await db.query("UPDATE usage_counters SET count=1 WHERE key=$1", [key]);
      await db.query(
        "UPDATE organization_members SET valid_until=NULL WHERE organization_id=$1 AND user_id=$2",
        [org.id, member.id],
      );
      await call(
        owner.client,
        "PATCH",
        `/api/organizations/${org.id}/members/${member.id}`,
        { role: "admin", state: "active" },
      );
      project = await (
        await call(
          owner.client,
          "PATCH",
          `/api/projects/${project.id}/settings`,
          { visibility: "private" },
        )
      ).json();
      await call(member.client, "GET", "/api/projects/" + project.id);
      await call(
        member.client,
        "POST",
        `/api/organizations/${org.id}/invitations`,
        { email: outsider.email, role: "admin" },
        403,
      );
      await call(
        member.client,
        "PATCH",
        `/api/organizations/${org.id}/members/${owner.id}`,
        { role: "member", state: "revoked" },
        403,
      );
      await call(
        owner.client,
        "PATCH",
        `/api/organizations/${org.id}/members/${member.id}`,
        { role: "member", state: "active" },
      );
      await call(
        member.client,
        "GET",
        "/api/projects/" + project.id,
        undefined,
        404,
      );

      const expiring = await (
        await call(
          owner.client,
          "POST",
          `/api/organizations/${org.id}/invitations`,
          { email: outsider.email, role: "viewer" },
          201,
        )
      ).json();

      const expiredToken = new URL(
        await emailLink(outsider.email, "Join"),
      ).pathname
        .split("/")
        .pop()!;

      await db.query(
        "UPDATE invitations SET expires_at=now()-interval '1 second' WHERE id=$1",
        [expiring.id],
      );
      await call(
        outsider.client,
        "POST",
        "/api/invitations/" + expiredToken,
        {},
        410,
      );

      const revocable = await (
        await call(
          owner.client,
          "POST",
          `/api/organizations/${org.id}/invitations`,
          { email: outsider.email, role: "viewer" },
          201,
        )
      ).json();

      const revokedToken = new URL(
        await emailLink(outsider.email, "Join"),
      ).pathname
        .split("/")
        .pop()!;

      await call(
        owner.client,
        "DELETE",
        `/api/organizations/${org.id}/invitations/${revocable.id}`,
      );
      await call(
        outsider.client,
        "POST",
        "/api/invitations/" + revokedToken,
        {},
        410,
      );
      await db.query('UPDATE "user" SET disabled=true WHERE id=$1', [owner.id]);
      await call(owner.client, "GET", "/api/organizations", undefined, 401);
      await db.query('UPDATE "user" SET disabled=false WHERE id=$1', [
        owner.id,
      ]);

      const cross = await owner.client.post("/api/compile", {
        headers: { Origin: "https://foreign.test" },
        data: { projectId: project.id, revision: project.revision },
      });

      assert.equal(cross.status(), 403);
      await call(
        owner.client,
        "PATCH",
        `/api/organizations/${org.id}/members/${owner.id}`,
        { role: "viewer", state: "revoked" },
        403,
      );

      const audit = await (
        await call(owner.client, "GET", "/api/organizations/" + org.id)
      ).json();

      assert.ok(
        audit.events.some(
          (e: { action: string }) => e.action === "membership.changed",
        ),
      );

      const enabled = await (
        await call(owner.client, "POST", "/api/auth/two-factor/enable", {
          password,
          method: "totp",
        })
      ).json();

      const code = totp(new URL(enabled.totpURI).searchParams.get("secret")!);
      await call(owner.client, "POST", "/api/auth/two-factor/verify-totp", {
        code,
      });
      await call(owner.client, "POST", "/api/auth/sign-out", {});

      const pending = await (
        await call(owner.client, "POST", "/api/auth/sign-in/email", {
          email: owner.email,
          password,
        })
      ).json();

      assert.equal(pending.twoFactorRedirect, true);
      await call(owner.client, "GET", "/api/organizations", undefined, 401);
      await call(
        owner.client,
        "POST",
        "/api/auth/two-factor/verify-totp",
        { code: "000000" },
        401,
      );
      await call(
        owner.client,
        "POST",
        "/api/auth/two-factor/verify-backup-code",
        { code: enabled.backupCodes[0] },
      );
      await call(owner.client, "GET", "/api/organizations");
      await call(owner.client, "POST", "/api/auth/two-factor/disable", {
        password,
      });
      await call(owner.client, "POST", "/api/auth/request-password-reset", {
        email: owner.email,
        redirectTo: "/reset-password",
      });
      const reset = await emailLink(owner.email, "Reset");
      const redirect = await anonymous.get(reset, { maxRedirects: 0 });
      const location = redirect.headers().location;
      assert.ok(location);
      const resetToken = new URL(location, baseURL).searchParams.get("token");
      assert.ok(resetToken);
      const newPassword = password + "-new";
      await call(anonymous, "POST", "/api/auth/reset-password", {
        token: resetToken,
        newPassword,
      });
      await call(owner.client, "GET", "/api/organizations", undefined, 401);
      await call(owner.client, "POST", "/api/auth/sign-in/email", {
        email: owner.email,
        password: newPassword,
      });
      await call(owner.client, "GET", "/api/organizations");
      console.log(
        "Verified auth, RBAC/ABAC, CAS, real PDF, tenant isolation, revocation, expiry, quotas, MFA and reset passed.",
      );
    } finally {
      // Only ephemeral accounts created by this run are removed; never touch developer accounts.
      for (const u of users) {
        await db.query("DELETE FROM organizations WHERE owner_id=$1", [u.id]);
        await db.query('DELETE FROM "user" WHERE id=$1', [u.id]);
      }

      await Promise.all(contexts.map((c) => c.dispose()));
      await db.end();
    }
  },
);
