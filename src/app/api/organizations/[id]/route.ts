import { api, actorFor, json } from "@/server/http";
import { organizationDetails } from "@/server/workspaces/service";
import { identifier } from "@/server/validation";

export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () =>
    json(
      await organizationDetails(
        await actorFor(request),
        identifier((await context.params).id),
      ),
    ),
  );
}
