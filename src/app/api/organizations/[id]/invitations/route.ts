import { api, actorFor, json, jsonBody } from "@/lib/server/http";
import { inviteMember } from "@/lib/server/saas";
import { identifier, invitationInput } from "@/lib/server/schemas";

export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const actor = await actorFor(request, true);
    const input = await jsonBody(request, invitationInput, 4096);

    return json(
      await inviteMember(actor, identifier((await context.params).id), input),
      201,
    );
  });
}
