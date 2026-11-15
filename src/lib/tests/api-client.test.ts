import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateFlag, putFlag } from "../api-client";

const BODY = {
  enabled: true,
  percentage: 10,
  includeCohorts: [],
  excludeCohorts: [],
  sticky: false,
};

function respond(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () =>
    typeof body === "string"
      ? new Response(body, { status })
      : Response.json(body, { status }),
  );
}

function sent(fetchFn: ReturnType<typeof respond>) {
  const [url, init] = fetchFn.mock.calls[0];
  return {
    url,
    method: init?.method,
    headers: new Headers(init?.headers),
    body: JSON.parse(String(init?.body)),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("putFlag", () => {
  it("PUTs the body as JSON with X-User-Id and returns the flag", async () => {
    const flag = { key: "demo", ...BODY };
    const fetchFn = respond(200, { flag });
    expect(await putFlag("demo", BODY, "dev-1", fetchFn)).toStrictEqual({
      ok: true,
      flag,
    });
    const request = sent(fetchFn);
    expect(request.url).toBe("/api/flags/demo");
    expect(request.method).toBe("PUT");
    expect(request.headers.get("content-type")).toBe("application/json");
    expect(request.headers.get("x-user-id")).toBe("dev-1");
    expect(request.body).toStrictEqual(BODY);
  });

  it("sends no X-User-Id without an actor", async () => {
    const fetchFn = respond(200, { flag: { key: "demo", ...BODY } });
    await putFlag("demo", BODY, null, fetchFn);
    expect(sent(fetchFn).headers.has("x-user-id")).toBe(false);
  });

  it("encodes the key in the URL", async () => {
    const fetchFn = respond(200, { flag: { key: "a b", ...BODY } });
    await putFlag("a b", BODY, null, fetchFn);
    expect(sent(fetchFn).url).toBe("/api/flags/a%20b");
  });

  it("returns the error and issues of a 400", async () => {
    const fetchFn = respond(400, {
      error: "Invalid request body",
      issues: { percentage: ["Too big"] },
    });
    expect(await putFlag("demo", BODY, null, fetchFn)).toStrictEqual({
      ok: false,
      error: "Invalid request body",
      issues: { percentage: ["Too big"] },
    });
  });

  it("describes a failure without a JSON error body by its status", async () => {
    expect(
      await putFlag("demo", BODY, null, respond(500, "Internal Server Error")),
    ).toStrictEqual({ ok: false, error: "Request failed (500)", issues: {} });
    expect(await putFlag("demo", BODY, null, respond(502, {}))).toStrictEqual({
      ok: false,
      error: "Request failed (502)",
      issues: {},
    });
  });

  it("reports a network error", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await putFlag("demo", BODY, null, fetchFn)).toStrictEqual({
      ok: false,
      error: "Network error: Failed to fetch",
      issues: {},
    });
  });

  it("uses the global fetch by default", async () => {
    const fetchFn = respond(200, { flag: { key: "demo", ...BODY } });
    vi.stubGlobal("fetch", fetchFn);
    expect((await putFlag("demo", BODY, null)).ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledOnce();
  });
});

describe("evaluateFlag", () => {
  it("POSTs userId and cohorts and returns enabled and reason", async () => {
    const fetchFn = respond(200, { enabled: true, reason: "PERCENTAGE" });
    expect(
      await evaluateFlag("demo", { userId: "u1", cohorts: ["a"] }, fetchFn),
    ).toStrictEqual({ ok: true, enabled: true, reason: "PERCENTAGE" });
    const request = sent(fetchFn);
    expect(request.url).toBe("/api/flags/demo/evaluate");
    expect(request.method).toBe("POST");
    expect(request.headers.get("content-type")).toBe("application/json");
    expect(request.body).toStrictEqual({ userId: "u1", cohorts: ["a"] });
  });

  it("returns the error and issues of a 400", async () => {
    const fetchFn = respond(400, {
      error: "Invalid request body",
      issues: { userId: ["Required"] },
    });
    expect(
      await evaluateFlag("demo", { userId: "", cohorts: [] }, fetchFn),
    ).toStrictEqual({
      ok: false,
      error: "Invalid request body",
      issues: { userId: ["Required"] },
    });
  });

  it("uses the global fetch by default", async () => {
    vi.stubGlobal(
      "fetch",
      respond(200, { enabled: false, reason: "KILL_SWITCH" }),
    );
    expect(
      await evaluateFlag("demo", { userId: "u1", cohorts: [] }),
    ).toStrictEqual({ ok: true, enabled: false, reason: "KILL_SWITCH" });
  });
});
