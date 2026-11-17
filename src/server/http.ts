import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FlagKeySchema, MAX_ID_LENGTH, UserIdSchema } from "./schemas";

// Helpers shared by the route handlers. The parsers throw `BadRequestError`; `handle` turns it into
// a 400 with the body `{ error, issues }`, where `issues` maps field names to messages. Any other
// error (including Next's `notFound()`) is rethrown for Next to answer: 404, or 500 when unexpected.

type Issues = Record<string, string[] | undefined>;

/** Invalid client input; `handle` answers it with a 400. */
export class BadRequestError extends Error {
  constructor(
    message: string,
    readonly issues: Issues,
  ) {
    super(message);
    this.name = "BadRequestError";
  }
}

/** Wraps a route handler so a thrown `BadRequestError` becomes a 400 response. */
export function handle<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (!(error instanceof BadRequestError)) throw error;
      return NextResponse.json(
        { error: error.message, issues: error.issues },
        { status: 400 },
      );
    }
  };
}

/** The request's JSON body parsed with `schema`; throws `BadRequestError` when it is invalid. */
export async function parseJson<S extends z.ZodType>(
  request: NextRequest,
  schema: S,
): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new BadRequestError("Invalid JSON", {});
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    // A body that is not an object has no field errors; its message goes under `body`.
    const { formErrors, fieldErrors } = z.flattenError(result.error);
    throw new BadRequestError(
      "Invalid request body",
      formErrors.length > 0
        ? { ...fieldErrors, body: formErrors }
        : fieldErrors,
    );
  }
  return result.data;
}

/** `key` when it is a valid flag key; throws `BadRequestError` otherwise. */
export function parseKey(key: string): string {
  const result = FlagKeySchema.safeParse(key);
  if (!result.success) {
    throw new BadRequestError("Invalid flag key", {
      key: result.error.issues.map((issue) => issue.message),
    });
  }
  return result.data;
}

/** `userId` when it is a valid user id (a UUID); throws `BadRequestError` otherwise. */
export function parseUserId(userId: string): string {
  const result = UserIdSchema.safeParse(userId);
  if (!result.success) {
    throw new BadRequestError("Invalid user id", {
      userId: result.error.issues.map((issue) => issue.message),
    });
  }
  return result.data;
}

/**
 * The `X-User-Id` header, trimmed; `null` when it is absent or blank. Throws `BadRequestError`
 * when it is longer than `MAX_ID_LENGTH`, since it is stored in every audit entry.
 */
export function actorIdFrom(request: NextRequest): string | null {
  const actorId = request.headers.get("x-user-id")?.trim() || null;
  if (actorId && actorId.length > MAX_ID_LENGTH) {
    throw new BadRequestError("Invalid X-User-Id header", {
      "x-user-id": [`Must be at most ${MAX_ID_LENGTH} characters`],
    });
  }
  return actorId;
}
