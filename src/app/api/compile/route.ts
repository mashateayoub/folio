import { api, actorFor, json, jsonBody, HttpError } from "@/lib/server/http";
import { beginBuild, finishBuild, getProject } from "@/lib/server/saas";
import { buildInput } from "@/lib/server/schemas";
import { config } from "@/lib/server/config";

export const runtime = "nodejs";

export const maxDuration = 45;

export function POST(request: Request) {
  return api(async () => {
    const actor = await actorFor(request, true);
    const input = await jsonBody(request, buildInput, 4096);
    const build = await beginBuild(actor, input.projectId, input.revision);
    let result: Response;

    try {
      result = await fetch(config().COMPILER_URL + "/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + config().COMPILER_TOKEN,
        },
        body: JSON.stringify(build.project),
        signal: AbortSignal.timeout(38_000),
      });
    } catch {
      await finishBuild(
        build.id,
        null,
        "Compiler service is temporarily unavailable.",
      );
      throw new HttpError(503, "Compiler service is temporarily unavailable.");
    }

    if (!result.ok) {
      const failure = await result
        .json()
        .catch(() => ({ error: "Compilation failed.", log: "" }));

      await finishBuild(build.id, null, String(failure.log || failure.error));
      await getProject(await actorFor(request), input.projectId);

      return json(
        {
          error: failure.error || "Compilation failed.",
          log: failure.log || "",
          buildId: build.id,
        },
        result.status,
      );
    }

    const buffer = Buffer.from(await result.arrayBuffer());

    if (
      buffer.length > 16_000_000 ||
      buffer.subarray(0, 5).toString() !== "%PDF-"
    ) {
      await finishBuild(
        build.id,
        null,
        "Compiler returned an invalid artifact.",
      );
      throw new HttpError(502, "Compiler returned an invalid artifact.");
    }

    await finishBuild(build.id, buffer, "");
    await getProject(await actorFor(request), input.projectId);

    return json({
      buildId: build.id,
      revision: build.revision,
      pdfUrl: "/api/builds/" + build.id + "/pdf",
    });
  });
}
