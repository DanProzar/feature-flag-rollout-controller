import { type Db, MongoServerError } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { frozenClock } from "../../domain";
import { createCohortsRepository } from "../cohorts";
import { createFlagsRepository } from "../flags";
import { resetFlagsAndAssignments } from "../reset";
import { SEED_COHORTS, SEED_FLAGS, SEED_USERS, seed } from "../seed";
import { createUsersRepository } from "../users";
import { useTestDb } from "./harness";

const t = useTestDb();
const T1 = new Date("2026-01-01T00:00:00.000Z");
const clock = frozenClock(T1);

const ALL_SEEDED = {
  cohorts: { seeded: true, count: 4 },
  users: { seeded: true, count: 6 },
  flags: { seeded: true, count: 5 },
};
const NONE_SEEDED = {
  cohorts: { seeded: false, count: 0 },
  users: { seeded: false, count: 0 },
  flags: { seeded: false, count: 0 },
};

beforeEach(() => t.clear());

async function counts() {
  const count = (name: string) => t.db.collection(name).countDocuments();
  return {
    cohorts: await count("cohorts"),
    users: await count("users"),
    flags: await count("flags"),
    audit: await count("audit"),
  };
}

describe("seed", () => {
  it("seeds an empty database without audit entries", async () => {
    expect(await seed(t.db, clock)).toEqual(ALL_SEEDED);
    expect(await counts()).toEqual({
      cohorts: 4,
      users: 6,
      flags: 5,
      audit: 0,
    });

    expect(await createCohortsRepository(t.db).list()).toStrictEqual(
      [...SEED_COHORTS].sort((a, b) => a.key.localeCompare(b.key)),
    );
    expect(await createUsersRepository(t.db).list()).toStrictEqual(SEED_USERS);
    const flags = createFlagsRepository(t.db, clock);
    for (const flag of SEED_FLAGS) {
      expect(await flags.get(flag.key)).toStrictEqual(flag);
    }
    const raw = await t.db.collection("flags").findOne({ key: "new-checkout" });
    expect(raw).toMatchObject({ createdAt: T1, updatedAt: T1 });
  });

  it("does nothing on a second run and keeps later edits", async () => {
    await seed(t.db, clock);
    const flags = createFlagsRepository(t.db, clock);
    const edited = { ...SEED_FLAGS[0], percentage: 90 };
    await flags.upsert(edited);
    const users = createUsersRepository(t.db);
    const alice = { ...SEED_USERS[0], name: "Alicia" };
    await users.update(alice);

    expect(await seed(t.db, clock)).toEqual(NONE_SEEDED);
    expect(await counts()).toEqual({
      cohorts: 4,
      users: 6,
      flags: 5,
      audit: 0,
    });
    expect(await flags.get(edited.key)).toStrictEqual(edited);
    expect(await users.get(alice.userId)).toStrictEqual(alice);
  });

  it("re-seeds only flags after a reset", async () => {
    await seed(t.db, clock);
    await resetFlagsAndAssignments(t.db);
    expect(await seed(t.db, clock)).toEqual({
      ...NONE_SEEDED,
      flags: { seeded: true, count: 5 },
    });
    expect(await counts()).toEqual({
      cohorts: 4,
      users: 6,
      flags: 5,
      audit: 0,
    });
  });

  it("re-seeds only users after users.clear()", async () => {
    await seed(t.db, clock);
    await createUsersRepository(t.db).clear();
    expect(await seed(t.db, clock)).toEqual({
      ...NONE_SEEDED,
      users: { seeded: true, count: 6 },
    });
  });

  it("re-seeds only cohorts after cohorts.clear()", async () => {
    await seed(t.db, clock);
    await createCohortsRepository(t.db).clear();
    expect(await seed(t.db, clock)).toEqual({
      ...NONE_SEEDED,
      cohorts: { seeded: true, count: 4 },
    });
  });

  it("leaves a collection with non-seed data alone", async () => {
    const users = createUsersRepository(t.db);
    const custom = await users.create({ name: "Zed", cohorts: [] });
    expect(await seed(t.db, clock)).toEqual({
      ...ALL_SEEDED,
      users: { seeded: false, count: 0 },
    });
    expect(await users.list()).toStrictEqual([custom]);
  });

  it("seeds each collection exactly once across concurrent runs", async () => {
    const results = await Promise.all([seed(t.db, clock), seed(t.db, clock)]);
    for (const name of ["cohorts", "users", "flags"] as const) {
      const seeded = results.filter((r) => r[name].seeded);
      expect(seeded).toHaveLength(1);
      expect(seeded[0][name]).toEqual(ALL_SEEDED[name]);
    }
    expect(await counts()).toEqual({
      cohorts: 4,
      users: 6,
      flags: 5,
      audit: 0,
    });
  });

  it("skips every collection when its emptiness check was stale (lost the race)", async () => {
    await seed(t.db, clock);
    const real = t.db;
    // Every collection claims to be empty, as if another run seeded it right after the check.
    const stale = {
      collection: (name: string) =>
        new Proxy(real.collection(name), {
          get: (target, prop, receiver) =>
            prop === "countDocuments"
              ? async () => 0
              : Reflect.get(target, prop, receiver),
        }),
    } as unknown as Db;
    expect(await seed(stale, clock)).toEqual(NONE_SEEDED);
    expect(await counts()).toEqual({
      cohorts: 4,
      users: 6,
      flags: 5,
      audit: 0,
    });
  });

  it("rethrows insert errors other than duplicate keys", async () => {
    const real = t.db;
    const failing = {
      collection: (name: string) => {
        const collection = real.collection(name);
        if (name !== "users") return collection;
        return {
          countDocuments: collection.countDocuments.bind(collection),
          insertMany: vi
            .fn()
            .mockRejectedValue(
              new MongoServerError({ message: "disk full", code: 14031 }),
            ),
        };
      },
    } as unknown as Db;
    await expect(seed(failing, clock)).rejects.toThrow("disk full");
  });
});
