import { api, actorFor, json, HttpError } from "@/lib/server/http";
import { invitation } from "@/lib/server/saas";

function token(value: string) {
  if (!/^[a-f0-9]{64}$/.test(value))
    throw new HttpError(404, "Invitation not found.");

  return value;
}

export function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  return api(async () =>
    json(
      await invitation(
        await actorFor(request),
        token((await context.params).token),
      ),
    ),
  );
}

export function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  return api(async () =>
    json(
      await invitation(
        await actorFor(request, true),
        token((await context.params).token),
        true,
      ),
    ),
  );
}
