import { api, actorFor, json, jsonBody } from "@/lib/server/http";
import { setProjectAttributes } from "@/lib/server/saas";
import { attributesInput, identifier } from "@/lib/server/schemas";

export function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const actor = await actorFor(request, true);
    const input = await jsonBody(request, attributesInput, 4096);

    return json(
      await setProjectAttributes(
        actor,
        identifier((await context.params).id),
        input,
      ),
    );
  });
}
