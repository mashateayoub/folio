import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { z } from "zod";
import { cloud, CloudError } from "../src/lib/cloud-client";
import { responses } from "../src/lib/api-responses";
import { starterProject } from "../src/lib/project";

test("API responses validate project contracts and preserve HTTP errors", async () => {
  const project = {
    ...starterProject,
    revision: 1,
    organizationId: "org",
    ownerId: "owner",
    visibility: "private",
    state: "active",
    permissions: {
      read: true,
      write: true,
      compile: true,
      manage: true,
      delete: true,
    },
  };

  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");

    if (request.url === "/denied") {
      response.statusCode = 403;
      response.end(JSON.stringify({ error: "Access revoked." }));

      return;
    }

    response.end(
      JSON.stringify(
        request.url === "/valid"
          ? project
          : { ...project, revision: "invalid" },
      ),
    );
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = z.object({ port: z.number() }).parse(server.address());
    const base = "http://127.0.0.1:" + address.port;
    assert.deepEqual(await cloud(base + "/valid", responses.project), project);
    await assert.rejects(
      cloud(base + "/invalid", responses.project),
      (error) => error instanceof CloudError && error.status === 502,
    );
    await assert.rejects(
      cloud(base + "/denied", responses.project),
      (error) =>
        error instanceof CloudError &&
        error.status === 403 &&
        error.message === "Access revoked.",
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
