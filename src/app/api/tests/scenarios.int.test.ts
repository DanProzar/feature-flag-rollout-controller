import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SEED_USERS, seed } from "@/data";
import { appClock } from "@/server";
import { audit, evaluate, put, reset, useApi } from "./helpers";

// Roadmap item 27: the API behaviour end to end, through the route handlers.

const t = useApi();
const NOW = "2026-01-01T00:00:00.000Z";

const FLAG = {
  enabled: true,
  percentage: 100,
  includeCohorts: [],
  excludeCohorts: [],
  sticky: true,
};

beforeAll(() => vi.stubEnv("ENABLE_TEST_ENDPOINTS", "true"));
afterAll(() => vi.unstubAllEnvs());

async function start(now = NOW) {
  expect(await reset({ now })).toEqual({ status: 200, body: { now } });
}

describe("reset", () => {
  it("with now gives exact audit `at` values", async () => {
    await start();
    await put("demo", FLAG);
    await put("demo", { ...FLAG, percentage: 0 });
    const { body } = await audit("demo");
    expect(body.entries.map((e: { at: string }) => e.at)).toEqual([NOW, NOW]);

    await start("2026-02-03T04:05:06.789Z");
    await put("demo", FLAG);
    expect((await audit("demo")).body.entries[2].at).toBe(
      "2026-02-03T04:05:06.789Z",
    );
  });

  it("without now answers 400", async () => {
    await start();
    const res = await reset({});
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.issues)).toEqual(["now"]);
    // The clock stays where the last successful reset froze it.
    expect(appClock.now().toISOString()).toBe(NOW);
  });

  it("keeps the audit log; a re-created flag gets before: null", async () => {
    await start();
    const first = (await put("kept", FLAG)).body.flag;
    await start();
    expect(await evaluate("kept", { userId: "u1" })).toMatchObject({
      body: { reason: "FLAG_NOT_FOUND" },
    });
    expect((await audit("kept")).body.entries).toHaveLength(1);

    await put("kept", FLAG);
    const { entries } = (await audit("kept")).body;
    expect(entries).toHaveLength(2);
    expect(entries[0].after).toEqual(first);
    expect(entries[1].before).toBeNull();
  });
});

describe("PUT audit", () => {
  it("records create with before: null and update with before = previous flag", async () => {
    await start();
    const created = (await put("audited", FLAG)).body.flag;
    const updated = (await put("audited", { ...FLAG, sticky: false })).body
      .flag;
    const { entries } = (await audit("audited")).body;
    expect(entries).toEqual([
      { at: NOW, key: "audited", actorId: null, before: null, after: created },
      {
        at: NOW,
        key: "audited",
        actorId: null,
        before: created,
        after: updated,
      },
    ]);
  });

  it("takes actorId from X-User-Id, or null when it is missing", async () => {
    await start();
    await put("actor", FLAG);
    await put("actor", FLAG, { "X-User-Id": "pm-7" });
    await put("actor", FLAG, { "X-User-Id": "  " });
    const { entries } = (await audit("actor")).body;
    expect(entries.map((e: { actorId: string | null }) => e.actorId)).toEqual([
      null,
      "pm-7",
      null,
    ]);
  });

  it.each(Object.keys(FLAG))(
    "answers 400 when %s is missing",
    async (field) => {
      await start();
      const body: Record<string, unknown> = { ...FLAG };
      delete body[field];
      const res = await put("partial", body);
      expect(res.status).toBe(400);
      expect(res.body.issues).toHaveProperty(field);
      expect((await audit("partial")).body.entries).toEqual([]);
    },
  );
});

describe("evaluation over time", () => {
  it("a sticky flag keeps a user's value after the percentage drops", async () => {
    await start();
    await put("sticky", { ...FLAG, percentage: 100 });
    expect((await evaluate("sticky", { userId: "u1" })).body).toEqual({
      enabled: true,
      reason: "PERCENTAGE",
    });
    await put("sticky", { ...FLAG, percentage: 0 });
    expect((await evaluate("sticky", { userId: "u1" })).body).toEqual({
      enabled: true,
      reason: "STICKY",
    });
    expect((await evaluate("sticky", { userId: "u2" })).body).toEqual({
      enabled: false,
      reason: "PERCENTAGE",
    });
  });

  it("a non-sticky flag follows the new percentage", async () => {
    await start();
    await put("loose", { ...FLAG, sticky: false, percentage: 100 });
    expect((await evaluate("loose", { userId: "u1" })).body).toEqual({
      enabled: true,
      reason: "PERCENTAGE",
    });
    await put("loose", { ...FLAG, sticky: false, percentage: 0 });
    expect((await evaluate("loose", { userId: "u1" })).body).toEqual({
      enabled: false,
      reason: "PERCENTAGE",
    });
  });

  it.each([
    [{ enabled: false }, [], false, "KILL_SWITCH"],
    [{ excludeCohorts: ["blocked"] }, ["blocked"], false, "COHORT_EXCLUDED"],
    [{ includeCohorts: ["beta"] }, ["beta"], true, "COHORT_INCLUDED"],
  ])(
    "%j overrides a stored sticky value without overwriting it",
    async (override, cohorts, enabled, reason) => {
      await start();
      await put("override", FLAG);
      expect((await evaluate("override", { userId: "u1" })).body).toEqual({
        enabled: true,
        reason: "PERCENTAGE",
      });
      // Drop to 0% so a lost assignment would show up as `false` after the restore.
      await put("override", { ...FLAG, percentage: 0, ...override });
      expect(
        (await evaluate("override", { userId: "u1", cohorts })).body,
      ).toEqual({ enabled, reason });
      await put("override", { ...FLAG, percentage: 0 });
      expect(
        (await evaluate("override", { userId: "u1", cohorts })).body,
      ).toEqual({ enabled: true, reason: "STICKY" });
    },
  );
});

describe("seed data through the API", () => {
  // The Phase 2 requirements table: every seed flag for every seed user.
  const EXPECTED: Record<string, Record<string, [boolean, string]>> = {
    "new-checkout": {
      Alice: [false, "PERCENTAGE"],
      Bob: [true, "PERCENTAGE"],
      Carol: [true, "PERCENTAGE"],
      Dan: [true, "PERCENTAGE"],
      Eve: [true, "PERCENTAGE"],
      Frank: [false, "PERCENTAGE"],
    },
    "dark-mode": {
      Alice: [true, "COHORT_INCLUDED"],
      Bob: [true, "COHORT_INCLUDED"],
      Carol: [false, "PERCENTAGE"],
      Dan: [true, "COHORT_INCLUDED"],
      Eve: [true, "COHORT_INCLUDED"],
      Frank: [false, "PERCENTAGE"],
    },
    "beta-search": {
      Alice: [true, "PERCENTAGE"],
      Bob: [true, "PERCENTAGE"],
      Carol: [false, "COHORT_EXCLUDED"],
      Dan: [true, "PERCENTAGE"],
      Eve: [false, "COHORT_EXCLUDED"],
      Frank: [false, "COHORT_EXCLUDED"],
    },
    "legacy-banner": Object.fromEntries(
      SEED_USERS.map((u) => [u.name, [false, "KILL_SWITCH"]]),
    ),
    "ai-assistant": {
      Alice: [true, "COHORT_INCLUDED"],
      Bob: [true, "PERCENTAGE"],
      Carol: [true, "PERCENTAGE"],
      Dan: [false, "PERCENTAGE"],
      Eve: [false, "PERCENTAGE"],
      Frank: [false, "PERCENTAGE"],
    },
  };

  it("seed flags × seed users match the Phase 2 table", async () => {
    await start();
    await seed(t.db, appClock);
    for (const [key, byUser] of Object.entries(EXPECTED)) {
      for (const { userId, name, cohorts } of SEED_USERS) {
        const [enabled, reason] = byUser[name];
        const res = await evaluate(key, { userId, cohorts });
        expect({ key, name, ...res }).toEqual({
          key,
          name,
          status: 200,
          body: { enabled, reason },
        });
      }
    }
    // The sticky seed flag answers the stored values from now on.
    for (const { userId, name, cohorts } of SEED_USERS) {
      const [enabled] = EXPECTED["new-checkout"][name];
      expect(
        (await evaluate("new-checkout", { userId, cohorts })).body,
      ).toEqual({ enabled, reason: "STICKY" });
    }
    expect((await evaluate("unseeded", { userId: "x" })).body).toEqual({
      enabled: false,
      reason: "FLAG_NOT_FOUND",
    });
  });
});
