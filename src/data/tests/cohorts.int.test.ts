import { type Db, MongoServerError } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCohortsRepository } from "../cohorts";
import { DuplicateCohortError } from "../errors";
import type { Cohort } from "../schemas";
import { useTestDb } from "./harness";

const t = useTestDb();

beforeEach(() => t.clear());

function cohort(key: string, overrides: Partial<Cohort> = {}): Cohort {
  return {
    key,
    name: key.toUpperCase(),
    description: `The ${key}s`,
    ...overrides,
  };
}

describe("cohorts repository", () => {
  it("creates a cohort and gets it by key, or null", async () => {
    const cohorts = createCohortsRepository(t.db);
    expect(await cohorts.create(cohort("admin"))).toStrictEqual(
      cohort("admin"),
    );
    expect(await cohorts.get("admin")).toStrictEqual(cohort("admin"));
    expect(await cohorts.get("missing")).toBeNull();
  });

  it("throws DuplicateCohortError for an existing key", async () => {
    const cohorts = createCohortsRepository(t.db);
    await cohorts.create(cohort("admin"));
    const attempt = cohorts.create(cohort("admin", { name: "Other" }));
    await expect(attempt).rejects.toBeInstanceOf(DuplicateCohortError);
    await expect(attempt).rejects.toMatchObject({ key: "admin" });
    expect(await cohorts.get("admin")).toStrictEqual(cohort("admin"));
  });

  it("rethrows other insert errors", async () => {
    const failing = {
      collection: () => ({
        insertOne: vi
          .fn()
          .mockRejectedValue(
            new MongoServerError({ message: "boom", code: 2 }),
          ),
      }),
    } as unknown as Db;
    await expect(
      createCohortsRepository(failing).create(cohort("admin")),
    ).rejects.toThrow("boom");
  });

  it("lists cohorts sorted by key", async () => {
    const cohorts = createCohortsRepository(t.db);
    expect(await cohorts.list()).toEqual([]);
    for (const key of ["user", "admin", "tester", "developer"]) {
      await cohorts.create(cohort(key));
    }
    expect(await cohorts.list()).toStrictEqual(
      ["admin", "developer", "tester", "user"].map((k) => cohort(k)),
    );
  });

  it("throws when a stored document is malformed", async () => {
    await t.db.collection("cohorts").insertOne({ key: "broken", name: 42 });
    const cohorts = createCohortsRepository(t.db);
    await expect(cohorts.get("broken")).rejects.toThrow();
    await expect(cohorts.list()).rejects.toThrow();
  });

  it("updates name and description, returning the cohort", async () => {
    const cohorts = createCohortsRepository(t.db);
    await cohorts.create(cohort("admin"));
    const updated = cohort("admin", { name: "Admins", description: "" });
    expect(await cohorts.update(updated)).toStrictEqual(updated);
    expect(await cohorts.get("admin")).toStrictEqual(updated);
  });

  it("returns null when updating an unknown cohort, without creating it", async () => {
    const cohorts = createCohortsRepository(t.db);
    expect(await cohorts.update(cohort("ghost"))).toBeNull();
    expect(await t.db.collection("cohorts").countDocuments()).toBe(0);
  });

  it("deletes a cohort", async () => {
    const cohorts = createCohortsRepository(t.db);
    await cohorts.create(cohort("admin"));
    expect(await cohorts.delete("admin")).toBe(true);
    expect(await cohorts.delete("admin")).toBe(false);
    expect(await cohorts.get("admin")).toBeNull();
  });

  it("clears all cohorts", async () => {
    const cohorts = createCohortsRepository(t.db);
    await cohorts.create(cohort("admin"));
    await cohorts.create(cohort("user"));
    await cohorts.clear();
    expect(await cohorts.list()).toEqual([]);
  });
});
