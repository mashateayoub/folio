import { z } from "zod";

export class CloudError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function cloud<T>(
  url: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });

  const value: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(value);
    throw new CloudError(
      error.success ? error.data.error : "The request could not be completed.",
      response.status,
    );
  }

  const parsed = schema.safeParse(value);

  if (!parsed.success)
    throw new CloudError(
      "The server returned an invalid response. Please reload and try again.",
      502,
    );

  return parsed.data;
}
