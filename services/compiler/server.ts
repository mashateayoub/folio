import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { compileProject, CompileError } from "./compile";
import { projectSchema } from "../../src/lib/project";

const token = process.env.COMPILER_TOKEN;

if (!token || token.length < 24)
  throw new Error(
    "Set COMPILER_TOKEN to a private secret of at least 24 characters.",
  );

let active = false;

const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end('{"status":"ok"}');

    return;
  }

  const provided = request.headers.authorization || "";
  const expected = "Bearer " + token;

  if (
    Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  ) {
    response.writeHead(401);
    response.end();

    return;
  }

  if (request.method !== "POST" || request.url !== "/compile") {
    response.writeHead(404);
    response.end();

    return;
  }

  if (active) {
    response.writeHead(429, {
      "Retry-After": "2",
      "Content-Type": "application/json",
    });
    response.end(
      JSON.stringify({
        error: "The compiler is busy. Please try again in a moment.",
      }),
    );

    return;
  }

  active = true;

  try {
    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of request) {
      size += chunk.length;

      if (size > 1_000_000)
        throw new CompileError("Request is too large.", "", 413);
      chunks.push(Buffer.from(chunk));
    }

    let input: unknown;

    try {
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new CompileError("Invalid JSON.", "", 400);
    }

    const parsed = projectSchema.safeParse(input);

    if (!parsed.success)
      throw new CompileError(parsed.error.issues[0].message, "", 400);
    const result = await compileProject(parsed.data);
    response.writeHead(200, { "Content-Type": "application/pdf" });
    response.end(result.pdf);
  } catch (error) {
    const failure =
      error instanceof CompileError
        ? error
        : new CompileError("Unexpected compiler failure.", "", 500);

    response.writeHead(failure.status, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: failure.message, log: failure.log }));
  } finally {
    active = false;
  }
});

server.requestTimeout = 40_000;

server.listen(4100, process.env.COMPILER_HOST || "127.0.0.1", () =>
  console.log("Folio compiler listening on port 4100"),
);
