import { NextRequest } from "next/server";
import { afterAll, beforeAll } from "vitest";
import { type TestDb, useTestDb } from "@/data/tests/harness";
import {
  appClock,
  createServices,
  setServicesForTesting,
  unfreezeClock,
} from "@/server";
import { GET as getAudit } from "../flags/[key]/audit/route";
import { POST as postEvaluate } from "../flags/[key]/evaluate/route";
import { DELETE as deleteFlag, PUT as putFlag } from "../flags/[key]/route";
import { POST as postReset } from "../test/reset/route";
import { PUT as putUserCohorts } from "../users/[userId]/cohorts/route";

export interface ApiResponse {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests inspect arbitrary JSON
  body: any;
}

/**
 * Points the route handlers at this file's test database (`useTestDb()`) and the app clock;
 * unfreezes the clock and clears the override after the file's tests.
 */
export function useApi(): TestDb {
  const t = useTestDb();
  beforeAll(() => setServicesForTesting(createServices(t.db, appClock)));
  afterAll(() => {
    unfreezeClock();
    setServicesForTesting(null);
  });
  return t;
}

const BASE = "http://localhost:3000";

/** A string body is sent as is (e.g. invalid JSON); anything else as JSON. */
function request(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
}

function context(key: string) {
  return { params: Promise.resolve({ key }) };
}

/**
 * The handler's status and JSON body. Next's `notFound()` is thrown out of the handler, and Next
 * itself turns it into its 404 page; here it becomes `{ status: 404, body: null }`.
 */
async function read(pending: Promise<Response>): Promise<ApiResponse> {
  let response: Response;
  try {
    response = await pending;
  } catch (error) {
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith(NOT_FOUND_DIGEST)) {
      return { status: 404, body: null };
    }
    throw error;
  }
  return { status: response.status, body: await response.json() };
}

/** The digest of the error `notFound()` throws (see Next's `notFound` docs). */
const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

export async function put(
  key: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResponse> {
  return read(
    putFlag(request("PUT", `/api/flags/${key}`, body, headers), context(key)),
  );
}

export async function del(
  key: string,
  headers?: Record<string, string>,
): Promise<ApiResponse> {
  return read(
    deleteFlag(
      request("DELETE", `/api/flags/${key}`, undefined, headers),
      context(key),
    ),
  );
}

export async function putCohorts(
  userId: string,
  body: unknown,
): Promise<ApiResponse> {
  return read(
    putUserCohorts(request("PUT", `/api/users/${userId}/cohorts`, body), {
      params: Promise.resolve({ userId }),
    }),
  );
}

export async function evaluate(
  key: string,
  body: unknown,
): Promise<ApiResponse> {
  return read(
    postEvaluate(
      request("POST", `/api/flags/${key}/evaluate`, body),
      context(key),
    ),
  );
}

export async function audit(key: string): Promise<ApiResponse> {
  return read(
    getAudit(request("GET", `/api/flags/${key}/audit`), context(key)),
  );
}

export async function reset(body: unknown): Promise<ApiResponse> {
  return read(postReset(request("POST", "/api/test/reset", body)));
}
