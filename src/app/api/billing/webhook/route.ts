import { api, json, rawBody } from "@/server/http";
import {
  verifyBillingEvent,
  processBillingEvent,
} from "@/server/billing/service";

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
