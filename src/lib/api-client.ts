import type { EvaluationContext, Flag, Reason } from "../domain";
import type { PutFlagBody } from "../server/schemas";

// Browser calls to the HTTP API. They never throw: every outcome is a result, so components only
// branch on `ok`. `fetchFn` is injectable for tests.

export interface ApiFailure {
  ok: false;
  error: string;
  /** Field messages from a 400 body; `{}` otherwise. */
  issues: Record<string, string[] | undefined>;
}

export type PutFlagResult = { ok: true; flag: Flag } | ApiFailure;

export type EvaluateFlagResult =
  { ok: true; enabled: boolean; reason: Reason } | ApiFailure;

// Calls the global lazily, so tests can stub it after this module is loaded.
const globalFetch: typeof fetch = (input, init) => fetch(input, init);

async function request<T>(
  url: string,
  init: RequestInit,
  fetchFn: typeof fetch,
): Promise<{ ok: true; body: T } | ApiFailure> {
  let response: Response;
  try {
    response = await fetchFn(url, init);
  } catch (error) {
    return {
      ok: false,
      error: `Network error: ${(error as Error).message}`,
      issues: {},
    };
  }
  const body = await response.json().catch(() => null);
  if (response.ok) return { ok: true, body: body as T };
  return {
    ok: false,
    error: body?.error ?? `Request failed (${response.status})`,
    issues: body?.issues ?? {},
  };
}

function flagUrl(key: string): string {
  return `/api/flags/${encodeURIComponent(key)}`;
}

/** `PUT /api/flags/:key`, sending `X-User-Id` only when there is an actor. */
export async function putFlag(
  key: string,
  body: PutFlagBody,
  actorId: string | null,
  fetchFn: typeof fetch = globalFetch,
): Promise<PutFlagResult> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (actorId) headers["x-user-id"] = actorId;
  const result = await request<{ flag: Flag }>(
    flagUrl(key),
    { method: "PUT", headers, body: JSON.stringify(body) },
    fetchFn,
  );
  return result.ok ? { ok: true, flag: result.body.flag } : result;
}

/** `POST /api/flags/:key/evaluate`, exactly as a client application would call it. */
export async function evaluateFlag(
  key: string,
  ctx: EvaluationContext,
  fetchFn: typeof fetch = globalFetch,
): Promise<EvaluateFlagResult> {
  const result = await request<{ enabled: boolean; reason: Reason }>(
    `${flagUrl(key)}/evaluate`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ctx),
    },
    fetchFn,
  );
  return result.ok
    ? { ok: true, enabled: result.body.enabled, reason: result.body.reason }
    : result;
}
