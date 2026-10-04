import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowed,
  permissions,
  activeMembership,
  type AccessContext,
  type OrgRole,
} from "../src/lib/policy";

function context(role: OrgRole = "member"): AccessContext {
  return {
    actor: { id: "alice", emailVerified: true, disabled: false },
    organization: { id: "tenant", status: "active" },
    membership: {
      userId: "alice",
      organizationId: "tenant",
      role,
      state: "active",
      validUntil: null,
    },
    project: {
      ownerId: "bob",
      organizationId: "tenant",
      visibility: "private",
      state: "active",
    },
    grant: null,
    now: 1000,
  };
}

test("role matrix: administrators, project owners, editors and read-only seats", () => {
  for (const role of ["owner", "admin"] as const)
    assert.deepEqual(Object.values(permissions(context(role))), [
      true,
      true,
      true,
      true,
      true,
    ]);
  const owner = context();
  owner.project.ownerId = "alice";
  assert.deepEqual(Object.values(permissions(owner)), [
    true,
    true,
    true,
    true,
    true,
  ]);
  const editor = context();
  editor.grant = "editor";
  assert.deepEqual(Object.values(permissions(editor)), [
    true,
    true,
    true,
    false,
    false,
  ]);
  const viewer = context("viewer");
  viewer.grant = "editor";
  viewer.project.ownerId = "alice";
  assert.deepEqual(Object.values(permissions(viewer)), [
    true,
    false,
    false,
    false,
    false,
  ]);
  const reader = context();
  reader.grant = "viewer";
  assert.deepEqual(Object.values(permissions(reader)), [
    true,
    false,
    false,
    false,
    false,
  ]);
});

test("workspace visibility grants reading, never editing", () => {
  const c = context();
  assert.equal(allowed(c, "read"), false);
  c.project.visibility = "workspace";
  assert.deepEqual(Object.values(permissions(c)), [
    true,
    false,
    false,
    false,
    false,
  ]);
});

test("ABAC rejects wrong tenants, identities, expired or revoked membership and disabled users", () => {
  const cases: ((c: AccessContext) => void)[] = [
    (c) => (c.actor.disabled = true),
    (c) => (c.actor.emailVerified = false),
    (c) => (c.organization.status = "suspended"),
    (c) => (c.membership = null),
    (c) => (c.membership!.state = "revoked"),
    (c) => (c.membership!.userId = "mallory"),
    (c) => (c.membership!.organizationId = "foreign"),
    (c) => (c.project.organizationId = "foreign"),
    (c) => (c.membership!.validUntil = new Date(1000)),
    (c) => (c.membership!.validUntil = "invalid"),
  ];

  for (const change of cases) {
    const c = context("owner");
    change(c);
    assert.deepEqual(Object.values(permissions(c)), [
      false,
      false,
      false,
      false,
      false,
    ]);
  }

  const c = context("owner");
  c.membership!.validUntil = new Date(1001);
  assert.equal(allowed(c, "write"), true);
  assert.equal(
    activeMembership({ ...c.membership!, validUntil: "invalid" }),
    false,
  );
});

test("archived resources remain readable but cannot compile or save", () => {
  const c = context("owner");
  c.project.state = "archived";
  assert.deepEqual(Object.values(permissions(c)), [
    true,
    false,
    false,
    true,
    true,
  ]);
});
