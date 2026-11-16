import { type Db, MongoServerError } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { frozenClock } from "../../domain";
import { createAssignmentsRepository } from "../assignments";
import { useTestDb } from "./harness";

const t = useTestDb();

const T1 = new Date("2026-01-01T00:00:00.000Z");
const T2 = new Date("2026-01-02T00:00:00.000Z");

beforeEach(() => t.clear());

/** A `Db` whose `assignments` collection fails `findOneAndUpdate` with `error`, once. */
function dbFailingUpsertOnce(error: Error): Db {
  return {
    collection: (name: string) => {
      const real = t.db.collection(name);
      return {
        findOne: real.findOne.bind(real),
        findOneAndUpdate: vi.fn().mockRejectedValueOnce(error),
      };
    },
  } as unknown as Db;
}

describe("assignments repository", () => {
  it("returns undefined when there is no assignment", async () => {
    const assignments = createAssignmentsRepository(t.db, frozenClock(T1));
    expect(await assignments.get("new-checkout", "u1")).toBeUndefined();
  });

  it("stores the first value with createdAt from the clock", async () => {
    const assignments = createAssignmentsRepository(t.db, frozenClock(T1));
    expect(await assignments.insertIfAbsent("new-checkout", "u1", true)).toBe(
      true,
    );
    expect(await assignments.get("new-checkout", "u1")).toBe(true);
    const raw = await t.db
      .collection("assignments")
      .findOne({ flagKey: "new-checkout", userId: "u1" });
    expect(raw).toMatchObject({ value: true, createdAt: T1 });
  });

  it("keeps the first value and returns it to later writers", async () => {
    await createAssignmentsRepository(t.db, frozenClock(T1)).insertIfAbsent(
      "new-checkout",
      "u1",
      true,
    );
    const later = createAssignmentsRepository(t.db, frozenClock(T2));
    expect(await later.insertIfAbsent("new-checkout", "u1", false)).toBe(true);
    expect(await later.get("new-checkout", "u1")).toBe(true);
    const raw = await t.db
      .collection("assignments")
      .findOne({ flagKey: "new-checkout", userId: "u1" });
    expect(raw).toMatchObject({ value: true, createdAt: T1 });
  });

  it("keeps flags and users independent", async () => {
    const assignments = createAssignmentsRepository(t.db, frozenClock(T1));
    await assignments.insertIfAbsent("a", "u1", true);
    await assignments.insertIfAbsent("b", "u1", false);
    await assignments.insertIfAbsent("a", "u2", false);
    expect(await assignments.get("a", "u1")).toBe(true);
    expect(await assignments.get("b", "u1")).toBe(false);
    expect(await assignments.get("a", "u2")).toBe(false);
    expect(await assignments.get("b", "u2")).toBeUndefined();
  });

  it("deletes every user's value for one flag only", async () => {
    const assignments = createAssignmentsRepository(t.db, frozenClock(T1));
    await assignments.insertIfAbsent("a", "u1", true);
    await assignments.insertIfAbsent("a", "u2", false);
    await assignments.insertIfAbsent("b", "u1", true);
    await assignments.deleteByFlag("a");
    expect(await assignments.get("a", "u1")).toBeUndefined();
    expect(await assignments.get("a", "u2")).toBeUndefined();
    expect(await assignments.get("b", "u1")).toBe(true);
  });

  it("throws when a stored document is malformed", async () => {
    await t.db
      .collection("assignments")
      .insertOne({ flagKey: "a", userId: "u1", value: "yes" });
    const assignments = createAssignmentsRepository(t.db, frozenClock(T1));
    await expect(assignments.get("a", "u1")).rejects.toThrow();
  });

  describe("concurrency", () => {
    it("50 parallel first writes agree on one stored value", async () => {
      const assignments = createAssignmentsRepository(t.db, frozenClock(T1));
      for (let round = 0; round < 10; round++) {
        const userId = `racer-${round}`;
        const results = await Promise.all(
          Array.from({ length: 50 }, (_, i) =>
            assignments.insertIfAbsent("new-checkout", userId, i % 2 === 0),
          ),
        );
        const stored = await assignments.get("new-checkout", userId);
        expect(stored).toBeTypeOf("boolean");
        expect(new Set(results)).toEqual(new Set([stored]));
        expect(
          await t.db
            .collection("assignments")
            .countDocuments({ flagKey: "new-checkout", userId }),
        ).toBe(1);
      }
    });

    it("resolves a duplicate-key error by re-reading the stored value", async () => {
      await createAssignmentsRepository(t.db, frozenClock(T1)).insertIfAbsent(
        "new-checkout",
        "u1",
        false,
      );
      const duplicate = new MongoServerError({
        message: "E11000 duplicate key error",
        code: 11000,
      });
      const assignments = createAssignmentsRepository(
        dbFailingUpsertOnce(duplicate),
        frozenClock(T2),
      );
      expect(await assignments.insertIfAbsent("new-checkout", "u1", true)).toBe(
        false,
      );
    });

    it("rethrows other errors", async () => {
      const assignments = createAssignmentsRepository(
        dbFailingUpsertOnce(new Error("network down")),
        frozenClock(T1),
      );
      await expect(
        assignments.insertIfAbsent("new-checkout", "u1", true),
      ).rejects.toThrow("network down");
    });
  });
});
