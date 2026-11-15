import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AssignmentsRepository,
  createAssignmentsRepository,
  createAuditRepository,
  createFlagsRepository,
} from "../../data";
import { useTestDb } from "../../data/tests/harness";
import { evaluate, frozenClock } from "../../domain";
import { createFlagService, type Evaluation } from "../flags";
import type { PutFlagBody } from "../schemas";

const t = useTestDb();

const T1 = "2026-01-01T00:00:00.000Z";
const clock = frozenClock(new Date(T1));

const BODY: PutFlagBody = {
  enabled: true,
  percentage: 50,
  includeCohorts: ["beta"],
  excludeCohorts: ["internal"],
  sticky: true,
};

function service(
  assignments: AssignmentsRepository = createAssignmentsRepository(t.db, clock),
) {
  return createFlagService({
    flags: createFlagsRepository(t.db, clock),
    assignments,
    audit: createAuditRepository(t.db),
    clock,
  });
}

beforeEach(() => t.clear());

describe("flag service put", () => {
  it("creates a flag and audits it with before: null", async () => {
    const flags = service();
    const flag = await flags.put("demo", BODY, "dev-1");
    expect(flag).toStrictEqual({ key: "demo", ...BODY });
    expect(await createFlagsRepository(t.db, clock).get("demo")).toStrictEqual(
      flag,
    );
    expect(await flags.audit("demo")).toStrictEqual([
      {
        at: new Date(T1),
        key: "demo",
        actorId: "dev-1",
        before: null,
        after: flag,
      },
    ]);
  });

  it("replaces a flag and audits the previous one as before, oldest first", async () => {
    const flags = service();
    const first = await flags.put("demo", BODY, "dev-1");
    const second = await flags.put(
      "demo",
      { ...BODY, percentage: 10, sticky: false },
      "dev-2",
    );
    expect(second).toStrictEqual({
      key: "demo",
      ...BODY,
      percentage: 10,
      sticky: false,
    });
    const entries = await flags.audit("demo");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      actorId: "dev-1",
      before: null,
      after: first,
    });
    expect(entries[1]).toMatchObject({
      actorId: "dev-2",
      before: first,
      after: second,
    });
  });

  it("audits an unchanged PUT too", async () => {
    const flags = service();
    await flags.put("demo", BODY, null);
    await flags.put("demo", BODY, null);
    const entries = await flags.audit("demo");
    expect(entries).toHaveLength(2);
    expect(entries[1].before).toStrictEqual(entries[1].after);
  });

  it("stores a null actorId as null", async () => {
    const flags = service();
    await flags.put("demo", BODY, null);
    const [entry] = await flags.audit("demo");
    expect(entry.actorId).toBeNull();
    const raw = await t.db.collection("audit").findOne({ key: "demo" });
    expect(raw?.actorId).toBeNull();
  });
});

describe("flag service audit", () => {
  it("lists the entries of that key only", async () => {
    const flags = service();
    await flags.put("a", BODY, null);
    await flags.put("b", BODY, null);
    await flags.put("a", { ...BODY, enabled: false }, null);
    const entries = await flags.audit("a");
    expect(entries.map((e) => e.key)).toEqual(["a", "a"]);
  });

  it("is [] for an unknown key", async () => {
    expect(await service().audit("nope")).toEqual([]);
  });
});

describe("flag service evaluate", () => {
  const USER = { userId: "u1", cohorts: [] };
  const storedValue = () =>
    createAssignmentsRepository(t.db, clock).get("demo", "u1");
  const assignmentCount = () => t.db.collection("assignments").countDocuments();

  it("answers FLAG_NOT_FOUND for an unknown key without writing", async () => {
    expect(await service().evaluate("nope", USER)).toStrictEqual({
      enabled: false,
      reason: "FLAG_NOT_FOUND",
    });
    expect(await assignmentCount()).toBe(0);
    expect(await t.db.collection("flags").countDocuments()).toBe(0);
  });

  it("evaluates a non-sticky flag by percentage without touching assignments", async () => {
    const real = createAssignmentsRepository(t.db, clock);
    const spy = {
      get: vi.fn(real.get),
      insertIfAbsent: vi.fn(real.insertIfAbsent),
    };
    const flags = service(spy);
    const flag = await flags.put("demo", { ...BODY, sticky: false }, null);
    const { enabled, reason } = evaluate(flag, USER);
    for (let i = 0; i < 2; i++) {
      expect(await flags.evaluate("demo", USER)).toStrictEqual({
        enabled,
        reason,
      });
    }
    expect(reason).toBe("PERCENTAGE");
    expect(spy.get).not.toHaveBeenCalled();
    expect(spy.insertIfAbsent).not.toHaveBeenCalled();
    expect(await assignmentCount()).toBe(0);
  });

  it("stores a sticky flag's first result, then answers STICKY with it", async () => {
    const flags = service();
    const flag = await flags.put("demo", BODY, null);
    const expected = evaluate(flag, USER).enabled;
    expect(await flags.evaluate("demo", USER)).toStrictEqual({
      enabled: expected,
      reason: "PERCENTAGE",
    });
    expect(await storedValue()).toBe(expected);
    expect(await flags.evaluate("demo", USER)).toStrictEqual({
      enabled: expected,
      reason: "STICKY",
    });
    expect(await assignmentCount()).toBe(1);
  });

  it("answers a stored value even when the bucket says otherwise", async () => {
    const flags = service();
    const flag = await flags.put("demo", BODY, null);
    const opposite = !evaluate(flag, USER).enabled;
    await createAssignmentsRepository(t.db, clock).insertIfAbsent(
      "demo",
      "u1",
      opposite,
    );
    expect(await flags.evaluate("demo", USER)).toStrictEqual({
      enabled: opposite,
      reason: "STICKY",
    });
  });

  it("answers the stored value when a concurrent evaluation stored first", async () => {
    const real = createAssignmentsRepository(t.db, clock);
    const flag = await service().put("demo", BODY, null);
    const opposite = !evaluate(flag, USER).enabled;
    // Another request stores the opposite value right after this one found nothing.
    const racing: AssignmentsRepository = {
      async get(flagKey, userId) {
        const value = await real.get(flagKey, userId);
        await real.insertIfAbsent(flagKey, userId, opposite);
        return value;
      },
      insertIfAbsent: real.insertIfAbsent,
    };
    expect(await service(racing).evaluate("demo", USER)).toStrictEqual({
      enabled: opposite,
      reason: "PERCENTAGE",
    });
    expect(await storedValue()).toBe(opposite);
  });

  const OVERRIDES: [Partial<PutFlagBody>, string[], Evaluation][] = [
    [{ enabled: false }, [], { enabled: false, reason: "KILL_SWITCH" }],
    [
      { excludeCohorts: ["blocked"] },
      ["blocked"],
      { enabled: false, reason: "COHORT_EXCLUDED" },
    ],
    [
      { includeCohorts: ["beta"] },
      ["beta"],
      { enabled: true, reason: "COHORT_INCLUDED" },
    ],
  ];

  it.each(OVERRIDES)(
    "lets %j override a stored value without changing it",
    async (override, cohorts, expected) => {
      const flags = service();
      // The stored value is the opposite of the override's answer, so the override is visible.
      const stored = !expected.enabled;
      await flags.put("demo", { ...BODY, percentage: stored ? 100 : 0 }, null);
      await flags.evaluate("demo", USER);
      expect(await storedValue()).toBe(stored);

      await flags.put("demo", { ...BODY, ...override }, null);
      expect(
        await flags.evaluate("demo", { userId: "u1", cohorts }),
      ).toStrictEqual(expected);
      expect(await storedValue()).toBe(stored);
      expect(await assignmentCount()).toBe(1);
    },
  );

  it("never exposes persist", async () => {
    const flags = service();
    await flags.put("demo", BODY, null);
    const first = await flags.evaluate("demo", USER);
    const second = await flags.evaluate("demo", USER);
    expect(Object.keys(first).sort()).toEqual(["enabled", "reason"]);
    expect(Object.keys(second).sort()).toEqual(["enabled", "reason"]);
  });
});
