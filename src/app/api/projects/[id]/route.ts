import { api, actorFor, json, jsonBody } from "@/lib/server/http";
import { getProject, saveProject, deleteProject } from "@/lib/server/saas";
import { saveProjectInput, identifier } from "@/lib/server/schemas";

type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
  return api(async () =>
    json(
      await getProject(
        await actorFor(request),
        identifier((await context.params).id),
      ),
    ),
  );
}

export function PUT(request: Request, context: Context) {
  return api(async () => {
    const actor = await actorFor(request, true);
    const input = await jsonBody(request, saveProjectInput);

    return json(
      await saveProject(
        actor,
        identifier((await context.params).id),
        input.project,
        input.expectedRevision,
      ),
    );
  });
}

export function DELETE(request: Request, context: Context) {
  return api(async () => {
    const actor = await actorFor(request, true);
    await deleteProject(actor, identifier((await context.params).id));

    return json({ success: true });
  });
}
