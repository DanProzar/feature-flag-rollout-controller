import { beforeEach, describe, expect, it } from "vitest";
import { type Flag, frozenClock } from "../../domain";
import { createFlagsRepository } from "../flags";
import { useTestDb } from "./harness";

const t = useTestDb();

const T1 = new Date("2026-01-01T00:00:00.000Z");
const T2 = new Date("2026-01-02T00:00:00.000Z");

function flag(overrides: Partial<Flag> = {}): Flag {
  return {
    key: "new-checkout",
    enabled: true,
    percentage: 50,
    includeCohorts: ["beta"],
    excludeCohorts: ["internal"],
    sticky: true,
    ...overrides,
  };
}

beforeEach(() => t.clear());

describe("flags repository", () => {
  it("returns null for an unknown key", async () => {
    const flags = createFlagsRepository(t.db, frozenClock(T1));
    expect(await flags.get("missing")).toBeNull();
  });

  it("creates a flag, returning null, and reads back exactly the Flag fields", async () => {
    const flags = createFlagsRepository(t.db, frozenClock(T1));
    expect(await flags.upsert(flag())).toBeNull();
    const stored = await flags.get("new-checkout");
    expect(stored).toStrictEqual(flag());
    expect(Object.keys(stored!).sort()).toEqual(
      [
        "enabled",
        "excludeCohorts",
        "includeCohorts",
        "key",
        "percentage",
        "sticky",
      ].sort(),
    );
  });

  it("replaces the flag fully and returns the previous Flag", async () => {
    const flags = createFlagsRepository(t.db, frozenClock(T1));
    await flags.upsert(flag());
    const next = flag({
      enabled: false,
      percentage: 10,
      includeCohorts: [],
      excludeCohorts: [],
      sticky: false,
    });
    expect(await flags.upsert(next)).toStrictEqual(flag());
    expect(await flags.get("new-checkout")).toStrictEqual(next);
  });

  it("keeps createdAt and advances updatedAt", async () => {
    await createFlagsRepository(t.db, frozenClock(T1)).upsert(flag());
    const raw1 = await t.db
      .collection("flags")
      .findOne({ key: "new-checkout" });
    expect(raw1).toMatchObject({ createdAt: T1, updatedAt: T1 });

    await createFlagsRepository(t.db, frozenClock(T2)).upsert(
      flag({ percentage: 70 }),
    );
    const raw2 = await t.db
      .collection("flags")
      .findOne({ key: "new-checkout" });
    expect(raw2).toMatchObject({ createdAt: T1, updatedAt: T2 });
  });

  it("stores one document per key", async () => {
    const flags = createFlagsRepository(t.db, frozenClock(T1));
    await flags.upsert(flag());
    await flags.upsert(flag({ percentage: 1 }));
    await Promise.all([
      flags.upsert(flag({ percentage: 2 })),
      flags.upsert(flag({ percentage: 3 })),
    ]);
    await flags.upsert(flag({ key: "other" }));
    const collection = t.db.collection("flags");
    expect(await collection.countDocuments({ key: "new-checkout" })).toBe(1);
    await expect(
      collection.insertOne({ ...flag(), createdAt: T1, updatedAt: T1 }),
    ).rejects.toThrow(/E11000/);
  });

  it("throws when a stored document is malformed", async () => {
    await t.db
      .collection("flags")
      .insertOne({ key: "broken", enabled: "yes", percentage: 500 });
    const flags = createFlagsRepository(t.db, frozenClock(T1));
    await expect(flags.get("broken")).rejects.toThrow();
  });
});
