import { api, actorFor, json, jsonBody } from "@/lib/server/http";
import { projectGrants, setProjectGrant } from "@/lib/server/saas";
import { grantInput, identifier } from "@/lib/server/schemas";

export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () =>
    json(
      await projectGrants(
        await actorFor(request),
        identifier((await context.params).id),
      ),
    ),
  );
}

export function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const actor = await actorFor(request, true);
    const input = await jsonBody(request, grantInput, 4096);
    await setProjectGrant(
      actor,
      identifier((await context.params).id),
      input.email,
      input.role,
    );

    return json({ success: true });
  });
}
