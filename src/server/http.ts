import { z } from "zod";
import { FlagKeySchema } from "./schemas";

// Helpers shared by the route handlers. Every 400 has the body `{ error, issues }`, where `issues`
// maps field names to messages. Unexpected errors are not caught: Next answers them with a 500.

type Issues = Record<string, string[] | undefined>;

function badRequest(error: string, issues: Issues): Response {
  return Response.json({ error, issues }, { status: 400 });
}

/** The request's JSON body parsed with `schema`, or a 400 response when it is invalid. */
export async function parseJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S> | Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("Invalid JSON", {});
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return badRequest(
      "Invalid request body",
      z.flattenError(result.error).fieldErrors,
    );
  }
  return result.data;
}

export function invalidKey(messages: string[]): Response {
  return badRequest("Invalid flag key", { key: messages });
}

/** `key` when it is a valid flag key, or a 400 response. */
export function parseKey(key: string): string | Response {
  const result = FlagKeySchema.safeParse(key);
  if (!result.success) {
    return invalidKey(result.error.issues.map((issue) => issue.message));
  }
  return result.data;
}

/** The `X-User-Id` header, trimmed; `null` when it is absent or blank. */
export function actorIdFrom(request: Request): string | null {
  return request.headers.get("x-user-id")?.trim() || null;
}
