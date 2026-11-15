import { validate, version } from "uuid";
import { describe, expect, it } from "vitest";
import { evaluate, type Reason } from "../../domain";
import { SEED_COHORTS, SEED_FLAGS, SEED_USERS } from "../seed";

const cohortKeys = SEED_COHORTS.map((c) => c.key);

/** Evaluates like the API: a sticky percentage result is stored and used next time. */
function evaluateTwice(flagKey: string, userId: string) {
  const flag = SEED_FLAGS.find((f) => f.key === flagKey)!;
  const user = SEED_USERS.find((u) => u.userId === userId)!;
  const ctx = { userId, cohorts: user.cohorts };
  const first = evaluate(flag, ctx);
  const second = first.persist ? evaluate(flag, ctx, first.enabled) : first;
  return { first, second };
}

function byName(name: string) {
  return SEED_USERS.find((u) => u.name === name)!.userId;
}

describe("SEED_COHORTS", () => {
  it("has exactly admin, tester, user and developer", () => {
    expect([...cohortKeys].sort()).toEqual([
      "admin",
      "developer",
      "tester",
      "user",
    ]);
    expect(new Set(cohortKeys).size).toBe(cohortKeys.length);
  });

  it("gives every cohort a name and description", () => {
    for (const c of SEED_COHORTS) {
      expect(c.name).not.toBe("");
      expect(c.description).not.toBe("");
    }
  });
});

describe("SEED_USERS", () => {
  it("has 5–7 users with unique UUID v7 ids", () => {
    expect(SEED_USERS.length).toBeGreaterThanOrEqual(5);
    expect(SEED_USERS.length).toBeLessThanOrEqual(7);
    const ids = SEED_USERS.map((u) => u.userId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(validate(id)).toBe(true);
      expect(version(id)).toBe(7);
    }
  });

  it("uses every seed cohort and only seed cohorts", () => {
    const used = new Set(SEED_USERS.flatMap((u) => u.cohorts));
    expect([...used].sort()).toEqual([...cohortKeys].sort());
  });

  it("has at least one user in several cohorts", () => {
    expect(SEED_USERS.some((u) => u.cohorts.length > 1)).toBe(true);
  });
});

describe("SEED_FLAGS", () => {
  it("matches the spec", () => {
    expect(SEED_FLAGS).toEqual([
      {
        key: "new-checkout",
        enabled: true,
        percentage: 50,
        includeCohorts: [],
        excludeCohorts: [],
        sticky: true,
      },
      {
        key: "dark-mode",
        enabled: true,
        percentage: 0,
        includeCohorts: ["tester", "developer"],
        excludeCohorts: [],
        sticky: false,
      },
      {
        key: "beta-search",
        enabled: true,
        percentage: 100,
        includeCohorts: [],
        excludeCohorts: ["user"],
        sticky: false,
      },
      {
        key: "legacy-banner",
        enabled: false,
        percentage: 100,
        includeCohorts: [],
        excludeCohorts: [],
        sticky: false,
      },
      {
        key: "ai-assistant",
        enabled: true,
        percentage: 35,
        includeCohorts: ["admin"],
        excludeCohorts: [],
        sticky: false,
      },
    ]);
  });

  it("references only seed cohorts", () => {
    for (const f of SEED_FLAGS) {
      for (const c of [...f.includeCohorts, ...f.excludeCohorts]) {
        expect(cohortKeys).toContain(c);
      }
    }
  });

  it("produces every reason except FLAG_NOT_FOUND against the seed users", () => {
    const reasons = new Set<Reason>();
    for (const f of SEED_FLAGS) {
      for (const u of SEED_USERS) {
        const { first, second } = evaluateTwice(f.key, u.userId);
        reasons.add(first.reason).add(second.reason);
      }
    }
    expect([...reasons].sort()).toEqual([
      "COHORT_EXCLUDED",
      "COHORT_INCLUDED",
      "KILL_SWITCH",
      "PERCENTAGE",
      "STICKY",
    ]);
  });

  it.each(["new-checkout", "ai-assistant"])(
    "%s is on by percentage for some users and off for others",
    (key) => {
      const results = SEED_USERS.map((u) => evaluateTwice(key, u.userId).first)
        .filter((r) => r.reason === "PERCENTAGE")
        .map((r) => r.enabled);
      expect(results).toContain(true);
      expect(results).toContain(false);
    },
  );

  it("buckets the seed users as documented", () => {
    const on = (key: string, name: string) =>
      evaluateTwice(key, byName(name)).first;
    for (const name of ["Bob", "Carol", "Dan", "Eve"]) {
      expect(on("new-checkout", name)).toMatchObject({
        enabled: true,
        reason: "PERCENTAGE",
        persist: true,
      });
    }
    for (const name of ["Alice", "Frank"]) {
      expect(on("new-checkout", name)).toMatchObject({
        enabled: false,
        reason: "PERCENTAGE",
      });
    }
    expect(on("ai-assistant", "Alice")).toMatchObject({
      enabled: true,
      reason: "COHORT_INCLUDED",
    });
    for (const name of ["Bob", "Carol"]) {
      expect(on("ai-assistant", name)).toMatchObject({
        enabled: true,
        reason: "PERCENTAGE",
      });
    }
    for (const name of ["Dan", "Eve", "Frank"]) {
      expect(on("ai-assistant", name)).toMatchObject({
        enabled: false,
        reason: "PERCENTAGE",
      });
    }
  });
});
