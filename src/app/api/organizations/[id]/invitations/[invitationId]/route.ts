import { api, actorFor, json } from "@/server/http";
import { revokeInvitation } from "@/server/invitations/service";
import { identifier } from "@/server/validation";

export function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; invitationId: string }> },
) {
  return api(async () => {
    const actor = await actorFor(request, true);
    const { id, invitationId } = await context.params;
    await revokeInvitation(actor, identifier(id), identifier(invitationId));

    return json({ success: true });
  });
}
