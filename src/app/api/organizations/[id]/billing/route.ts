import { actorFor, api, json } from "@/server/http";
import { identifier } from "@/server/validation";
import { billingSummary } from "@/server/billing/service";

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
