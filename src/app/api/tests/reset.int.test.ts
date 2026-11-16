import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audit, put, reset, useApi } from "./helpers";

const t = useApi();
const NOW = "2026-01-01T00:00:00.000Z";

const FLAG = {
  enabled: true,
  percentage: 0,
  includeCohorts: [],
  excludeCohorts: [],
  sticky: false,
};

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/test/reset", () => {
  it.each([undefined, "false", "TRUE", ""])(
    "answers 404 when ENABLE_TEST_ENDPOINTS is %j, even with an invalid body",
    async (value) => {
      if (value === undefined) vi.stubEnv("ENABLE_TEST_ENDPOINTS", undefined);
      else vi.stubEnv("ENABLE_TEST_ENDPOINTS", value);
      await put("demo", FLAG);
      for (const body of [{ now: NOW }, {}, "{"]) {
        expect((await reset(body)).status).toBe(404);
      }
      expect(await t.db.collection("flags").countDocuments()).toBe(1);
    },
  );

  it('answers 200 { now } with the normalised time and resets when it is "true"', async () => {
    vi.stubEnv("ENABLE_TEST_ENDPOINTS", "true");
    expect(await reset({ now: "2026-01-01T02:00:00+02:00" })).toEqual({
      status: 200,
      body: { now: NOW },
    });
    expect(await t.db.collection("flags").countDocuments()).toBe(0);
  });

  it("does not freeze the clock: later audit entries use the real time", async () => {
    vi.stubEnv("ENABLE_TEST_ENDPOINTS", "true");
    await reset({ now: NOW });
    const before = Date.now();
    await put("after-reset", FLAG);
    const [entry] = (await audit("after-reset")).body.entries;
    expect(Date.parse(entry.at)).toBeGreaterThan(Date.parse(NOW));
    expect(Date.parse(entry.at)).toBeGreaterThanOrEqual(before);
  });

  it.each([{}, { now: "" }, { now: "yesterday" }, { now: 0 }, "{"])(
    "answers 400 for %j",
    async (body) => {
      vi.stubEnv("ENABLE_TEST_ENDPOINTS", "true");
      const res = await reset(body);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("issues");
    },
  );
});
