import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, transaction, closeDatabase } from "@/server/database/client";
import {
  user,
  organizations,
  projects,
  organizationMembers,
} from "@/server/database/schema";
import { createProject } from "@/features/projects/model";

test("Drizzle preserves dates and JSON, and rolls back an entire transaction", async () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  const discardedId = randomUUID();

  try {
    await db()
      .insert(user)
      .values({
        id: userId,
        name: "ORM acceptance",
        email: userId + "@example.test",
        emailVerified: true,
        disabled: false,
      });
    await transaction(async (client) => {
      await client
        .insert(organizations)
        .values({ id: orgId, name: "ORM acceptance", owner_id: userId });
      await client.insert(organizationMembers).values({
        organization_id: orgId,
        user_id: userId,
        role: "owner",
        valid_until: new Date("2099-01-01T00:00:00Z"),
      });
      const source = createProject("blank");
      source.id = randomUUID();
      await client.insert(projects).values({
        id: source.id,
        organization_id: orgId,
        owner_id: userId,
        data: source,
      });

      const [stored] = await client
        .select()
        .from(projects)
        .where(eq(projects.id, source.id));

      const [member] = await client
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.organization_id, orgId));

      assert.deepEqual(stored.data, source);
      assert.ok(stored.created_at instanceof Date);
      assert.equal(
        member.valid_until?.toISOString(),
        "2099-01-01T00:00:00.000Z",
      );
    });
    await assert.rejects(
      transaction(async (client) => {
        await client.insert(organizations).values({
          id: discardedId,
          name: "Must roll back",
          owner_id: userId,
        });
        throw new Error("Deliberate rollback");
      }),
      /Deliberate rollback/,
    );
    assert.deepEqual(
      await db()
        .select()
        .from(organizations)
        .where(eq(organizations.id, discardedId)),
      [],
    );
  } finally {
    await db().delete(organizations).where(eq(organizations.owner_id, userId));
    await db().delete(user).where(eq(user.id, userId));
    await closeDatabase();
  }
});
