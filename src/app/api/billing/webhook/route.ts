import { api, json, rawBody } from "@/lib/server/http";
import { verifyBillingEvent, processBillingEvent } from "@/lib/server/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return api(async () => {
    const event = verifyBillingEvent(
      await rawBody(request, 1_000_000),
      request.headers.get("stripe-signature"),
    );

    await processBillingEvent(event);

    return json({ received: true });
  });
}
