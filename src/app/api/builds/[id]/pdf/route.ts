import { api, actorFor } from "@/lib/server/http";
import { artifact } from "@/lib/server/saas";
import { identifier } from "@/lib/server/schemas";

export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const pdf = await artifact(
      await actorFor(request),
      identifier((await context.params).id),
    );

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="document.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
