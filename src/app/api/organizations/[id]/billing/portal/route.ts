import { z } from "zod";
import { actorFor, api, json, jsonBody } from "@/lib/server/http";
import { identifier } from "@/lib/server/schemas";
import { portal } from "@/lib/server/billing";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const actor = await actorFor(request, true);
    await jsonBody(request, z.object({}).strict(), 4096);

    return json(await portal(actor, identifier((await params).id)));
  });
}
