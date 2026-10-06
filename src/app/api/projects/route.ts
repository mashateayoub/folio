import { api, actorFor, json, jsonBody } from "@/server/http";
import { createCloudProject, listProjects } from "@/server/projects/service";
import { createProjectInput, identifier } from "@/server/validation";

export function GET(request: Request) {
  return api(async () => {
    const actor = await actorFor(request);
    const id = new URL(request.url).searchParams.get("organizationId") || "";

    return json(await listProjects(actor, identifier(id)));
  });
}

export function POST(request: Request) {
  return api(async () => {
    const actor = await actorFor(request, true);
    const input = await jsonBody(request, createProjectInput, 4096);

    return json(
      await createCloudProject(actor, input.organizationId, input.template),
      201,
    );
  });
}
