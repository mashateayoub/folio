import { api, actorFor, json, jsonBody } from "@/server/http";
import { organizations, createOrganization } from "@/server/workspaces/service";
import { organizationInput } from "@/server/validation";

export function GET(request: Request) {
  return api(async () => json(await organizations(await actorFor(request))));
}

export function POST(request: Request) {
  return api(async () => {
    const actor = await actorFor(request, true);
    const input = await jsonBody(request, organizationInput, 4096);

    return json(await createOrganization(actor, input.name), 201);
  });
}
