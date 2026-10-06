import { z } from "zod";
import { api, actorFor, json, jsonBody } from "@/server/http";
import { projectSchema } from "@/features/projects/model";
import { createCloudProject } from "@/server/projects/service";

export function POST(request: Request) {
  return api(async () => {
    const actor = await actorFor(request, true);

    const input = await jsonBody(
      request,
      z
        .object({
          organizationId: z.string().uuid(),
          project: projectSchema.strict(),
        })
        .strict(),
    );

    return json(
      await createCloudProject(
        actor,
        input.organizationId,
        "blank",
        input.project,
      ),
      201,
    );
  });
}
