import { NextResponse } from "next/server";
import { z } from "zod";
import { config } from "./config";
import { getActor } from "./auth";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function actorFor(request: Request, mutation = false) {
  if (mutation) {
    const origin = request.headers.get("origin");
    const configured = new URL(config().APP_URL);
    const alternate = new URL(configured);

    if (configured.hostname === "localhost") alternate.hostname = "127.0.0.1";
    else if (configured.hostname === "127.0.0.1")
      alternate.hostname = "localhost";

    if (!origin || ![configured.origin, alternate.origin].includes(origin))
      throw new HttpError(403, "Request origin is not allowed.");
  }

  const actor = await getActor(request.headers);

  if (!actor) throw new HttpError(401, "Sign in to continue.");

  if (!actor.emailVerified)
    throw new HttpError(403, "Verify your email to continue.");

  return actor;
}

export async function rawBody(
  request: Request,
  limit = 1_000_000,
): Promise<Buffer> {
  const reader = request.body?.getReader();

  if (!reader) throw new HttpError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;
    size += value.byteLength;

    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function jsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  limit = 1_000_000,
): Promise<T> {
  const body = await rawBody(request, limit);
  let input: unknown;

  try {
    input = JSON.parse(body.toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }

  const parsed = schema.safeParse(input);

  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);

  return parsed.data;
}

export async function api(work: () => Promise<Response>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    console.error(
      "Request failed.",
      error instanceof Error ? error.name : "Unknown error",
    );

    return NextResponse.json(
      { error: "The server could not complete this request." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function json<T>(value: T, status = 200) {
  return NextResponse.json<T>(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
