import { api, actorFor, json, jsonBody } from "@/server/http";
import { changeOrgMember } from "@/server/workspaces/service";
import { identifier, memberInput } from "@/server/validation";

export function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  return api(async () => {
    const actor = await actorFor(request, true);
    const { id, userId } = await context.params;
    const input = await jsonBody(request, memberInput, 4096);
    await changeOrgMember(actor, identifier(id), userId, input);

    return json({ success: true });
  });
}
