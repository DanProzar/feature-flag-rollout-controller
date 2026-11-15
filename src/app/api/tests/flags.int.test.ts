import { beforeEach, describe, expect, it } from "vitest";
import { audit, evaluate, put, useApi } from "./helpers";

const t = useApi();

const BODY = {
  enabled: true,
  percentage: 100,
  includeCohorts: [],
  excludeCohorts: ["blocked"],
  sticky: true,
};

beforeEach(() => t.clear());

async function nothingStored() {
  expect(await t.db.collection("flags").countDocuments()).toBe(0);
  expect(await t.db.collection("audit").countDocuments()).toBe(0);
}

describe("PUT /api/flags/:key", () => {
  it("answers 200 { flag } with the key from the path", async () => {
    const res = await put("demo", { ...BODY, key: "other" });
    expect(res).toEqual({
      status: 200,
      body: { flag: { key: "demo", ...BODY } },
    });
    expect(
      await t.db.collection("flags").countDocuments({ key: "other" }),
    ).toBe(0);
  });

  it("answers 400 for an invalid key", async () => {
    const res = await put("Bad Key", BODY);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Invalid flag key",
      issues: { key: [expect.any(String)] },
    });
    await nothingStored();
  });

  it("answers 400 for invalid JSON", async () => {
    const res = await put("demo", "{");
    expect(res).toEqual({
      status: 400,
      body: { error: "Invalid JSON", issues: {} },
    });
    await nothingStored();
  });

  it.each(Object.keys(BODY))("answers 400 without %s", async (field) => {
    const body: Record<string, unknown> = { ...BODY };
    delete body[field];
    const res = await put("demo", body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body");
    expect(Object.keys(res.body.issues)).toEqual([field]);
    await nothingStored();
  });

  it.each([-1, 101, 12.5])(
    "answers 400 for percentage %j",
    async (percentage) => {
      const res = await put("demo", { ...BODY, percentage });
      expect(res.status).toBe(400);
      expect(Object.keys(res.body.issues)).toEqual(["percentage"]);
      await nothingStored();
    },
  );
});

describe("POST /api/flags/:key/evaluate", () => {
  it("answers 400 for an invalid key", async () => {
    const res = await evaluate("-x", { userId: "u1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid flag key");
  });

  it("answers 400 for invalid JSON", async () => {
    const res = await evaluate("demo", "nope");
    expect(res).toEqual({
      status: 400,
      body: { error: "Invalid JSON", issues: {} },
    });
  });

  it("answers 400 without userId", async () => {
    const res = await evaluate("demo", { cohorts: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body");
    expect(Object.keys(res.body.issues)).toEqual(["userId"]);
  });

  it("answers 200 without cohorts", async () => {
    await put("demo", BODY);
    expect(await evaluate("demo", { userId: "u1" })).toEqual({
      status: 200,
      body: { enabled: true, reason: "PERCENTAGE" },
    });
  });

  it("uses the given cohorts", async () => {
    await put("demo", BODY);
    expect(
      await evaluate("demo", { userId: "u1", cohorts: [" blocked "] }),
    ).toEqual({
      status: 200,
      body: { enabled: false, reason: "COHORT_EXCLUDED" },
    });
  });

  it("answers 200 FLAG_NOT_FOUND for an unknown flag", async () => {
    expect(await evaluate("nope", { userId: "u1" })).toEqual({
      status: 200,
      body: { enabled: false, reason: "FLAG_NOT_FOUND" },
    });
  });
});

describe("GET /api/flags/:key/audit", () => {
  it("answers 400 for an invalid key", async () => {
    const res = await audit("a/b");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid flag key");
  });

  it("answers 200 { entries: [] } for an unknown key", async () => {
    expect(await audit("nope")).toEqual({ status: 200, body: { entries: [] } });
  });

  it("answers the entries oldest first with ISO `at` strings", async () => {
    await put("demo", BODY, { "X-User-Id": "dev-1" });
    await put("demo", { ...BODY, enabled: false });
    const res = await audit("demo");
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
    const [first, second] = res.body.entries;
    expect(first).toEqual({
      at: expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/),
      key: "demo",
      actorId: "dev-1",
      before: null,
      after: { key: "demo", ...BODY },
    });
    expect(second).toMatchObject({
      actorId: null,
      before: { key: "demo", ...BODY },
      after: { key: "demo", ...BODY, enabled: false },
    });
  });
});
