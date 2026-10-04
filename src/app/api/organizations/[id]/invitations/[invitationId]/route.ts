import { api, actorFor, json } from "@/lib/server/http";
import { revokeInvitation } from "@/lib/server/saas";
import { identifier } from "@/lib/server/schemas";

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
