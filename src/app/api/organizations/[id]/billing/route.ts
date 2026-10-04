import { actorFor, api, json } from "@/lib/server/http";
import { identifier } from "@/lib/server/schemas";
import { billingSummary } from "@/lib/server/billing";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(async () =>
    json(
      await billingSummary(
        await actorFor(request),
        identifier((await params).id),
      ),
    ),
  );
}
