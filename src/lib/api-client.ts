import type { EvaluationContext, Flag, Reason } from "../domain";
import type { User } from "../server";
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

export type DeleteFlagResult = { ok: true; flag: Flag } | ApiFailure;

export type SetUserCohortsResult = { ok: true; user: User } | ApiFailure;

export type ResetDataResult = { ok: true; now: Date } | ApiFailure;

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

/** JSON headers, plus `X-User-Id` when `userId` is set. */
function headers(userId: string | null): Record<string, string> {
  const result: Record<string, string> = {
    "content-type": "application/json",
  };
  if (userId) result["x-user-id"] = userId;
  return result;
}

/** `PUT /api/flags/:key`, sending `X-User-Id` only when there is an actor. */
export async function putFlag(
  key: string,
  body: PutFlagBody,
  actorId: string | null,
  fetchFn: typeof fetch = globalFetch,
): Promise<PutFlagResult> {
  const result = await request<{ flag: Flag }>(
    flagUrl(key),
    { method: "PUT", headers: headers(actorId), body: JSON.stringify(body) },
    fetchFn,
  );
  return result.ok ? { ok: true, flag: result.body.flag } : result;
}

/** `DELETE /api/flags/:key`, sending `X-User-Id` only when there is an actor. */
export async function deleteFlag(
  key: string,
  actorId: string | null,
  fetchFn: typeof fetch = globalFetch,
): Promise<DeleteFlagResult> {
  const result = await request<{ flag: Flag }>(
    flagUrl(key),
    { method: "DELETE", headers: headers(actorId) },
    fetchFn,
  );
  return result.ok ? { ok: true, flag: result.body.flag } : result;
}

/** `PUT /api/users/:userId/cohorts`: replaces the user's cohorts. */
export async function setUserCohorts(
  userId: string,
  cohorts: string[],
  fetchFn: typeof fetch = globalFetch,
): Promise<SetUserCohortsResult> {
  const result = await request<{ user: User }>(
    `/api/users/${encodeURIComponent(userId)}/cohorts`,
    {
      method: "PUT",
      headers: headers(null),
      body: JSON.stringify({ cohorts }),
    },
    fetchFn,
  );
  return result.ok ? { ok: true, user: result.body.user } : result;
}

/**
 * `POST /api/flags/:key/evaluate`, exactly as a client application would call it: on behalf of the
 * user, so `X-User-Id` carries the evaluated `userId`.
 */
export async function evaluateFlag(
  key: string,
  ctx: EvaluationContext,
  fetchFn: typeof fetch = globalFetch,
): Promise<EvaluateFlagResult> {
  const result = await request<{ enabled: boolean; reason: Reason }>(
    `${flagUrl(key)}/evaluate`,
    {
      method: "POST",
      headers: headers(ctx.userId.trim() || null),
      body: JSON.stringify(ctx),
    },
    fetchFn,
  );
  return result.ok
    ? { ok: true, enabled: result.body.enabled, reason: result.body.reason }
    : result;
}

/**
 * `POST /api/test/reset`: clears flags and sticky assignments, recording `now` as the reset time.
 * Answers `404` unless the server has `ENABLE_TEST_ENDPOINTS=true`.
 */
export async function resetData(
  now: Date,
  fetchFn: typeof fetch = globalFetch,
): Promise<ResetDataResult> {
  const result = await request<{ now: string }>(
    "/api/test/reset",
    {
      method: "POST",
      headers: headers(null),
      body: JSON.stringify({ now: now.toISOString() }),
    },
    fetchFn,
  );
  return result.ok ? { ok: true, now: new Date(result.body.now) } : result;
}
