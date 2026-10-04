import { api, actorFor, json } from "@/lib/server/http";
import { organizationDetails } from "@/lib/server/saas";
import { identifier } from "@/lib/server/schemas";

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
