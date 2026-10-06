import { z } from "zod";
import { actorFor, api, json, jsonBody } from "@/server/http";
import { identifier } from "@/server/validation";
import { portal } from "@/server/billing/service";

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
