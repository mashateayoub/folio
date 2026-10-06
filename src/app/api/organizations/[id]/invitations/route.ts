import { api, actorFor, json, jsonBody } from "@/server/http";
import { inviteMember } from "@/server/invitations/service";
import { identifier, invitationInput } from "@/server/validation";

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
