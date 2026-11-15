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
import { PUT as putFlag } from "../flags/[key]/route";
import { POST as postReset } from "../test/reset/route";

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
): Request {
  return new Request(`${BASE}${path}`, {
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

async function read(response: Response): Promise<ApiResponse> {
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

export async function put(
  key: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResponse> {
  return read(
    await putFlag(
      request("PUT", `/api/flags/${key}`, body, headers),
      context(key),
    ),
  );
}

export async function evaluate(
  key: string,
  body: unknown,
): Promise<ApiResponse> {
  return read(
    await postEvaluate(
      request("POST", `/api/flags/${key}/evaluate`, body),
      context(key),
    ),
  );
}

export async function audit(key: string): Promise<ApiResponse> {
  return read(
    await getAudit(request("GET", `/api/flags/${key}/audit`), context(key)),
  );
}

export async function reset(body: unknown): Promise<ApiResponse> {
  return read(await postReset(request("POST", "/api/test/reset", body)));
}
