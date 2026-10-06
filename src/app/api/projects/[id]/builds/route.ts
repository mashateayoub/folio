import { api, actorFor, json } from "@/server/http";
import { latestBuild } from "@/server/builds/service";
import { identifier } from "@/server/validation";

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
