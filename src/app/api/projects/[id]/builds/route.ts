import { api, actorFor, json } from "@/lib/server/http";
import { latestBuild } from "@/lib/server/saas";
import { identifier } from "@/lib/server/schemas";

export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () =>
    json(
      await latestBuild(
        await actorFor(request),
        identifier((await context.params).id),
      ),
    ),
  );
}
