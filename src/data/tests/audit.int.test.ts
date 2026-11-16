import { beforeEach, describe, expect, it } from "vitest";
import type { Flag } from "../../domain";
import { createAuditRepository } from "../audit";
import type { AuditEntry } from "../schemas";
import { useTestDb } from "./harness";

const t = useTestDb();

beforeEach(() => t.clear());

function flag(overrides: Partial<Flag> = {}): Flag {
  return {
    key: "new-checkout",
    enabled: true,
    percentage: 50,
    includeCohorts: ["beta"],
    excludeCohorts: [],
    sticky: false,
    ...overrides,
  };
}

function entry(at: string, overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    at: new Date(at),
    key: "new-checkout",
    actorId: "admin-1",
    before: null,
    after: flag(),
    ...overrides,
  };
}

describe("audit repository", () => {
  it("lists nothing for an unknown key", async () => {
    expect(await createAuditRepository(t.db).listByKey("missing")).toEqual([]);
  });

  it("round-trips every field without _id", async () => {
    const audit = createAuditRepository(t.db);
    const created = entry("2026-01-01T00:00:00.000Z", { actorId: null });
    const updated = entry("2026-01-02T00:00:00.000Z", {
      before: flag(),
      after: flag({ percentage: 80, includeCohorts: [] }),
    });
    await audit.append(created);
    await audit.append(updated);
    expect(await audit.listByKey("new-checkout")).toStrictEqual([
      created,
      updated,
    ]);
  });

  it("round-trips a deletion entry with after: null", async () => {
    const audit = createAuditRepository(t.db);
    const deleted = entry("2026-01-01T00:00:00.000Z", {
      before: flag(),
      after: null,
    });
    await audit.append(deleted);
    expect(await audit.listByKey("new-checkout")).toStrictEqual([deleted]);
  });

  it("does not modify the caller's entry", async () => {
    const e = entry("2026-01-01T00:00:00.000Z");
    await createAuditRepository(t.db).append(e);
    expect(e).not.toHaveProperty("_id");
  });

  it("returns only the requested key", async () => {
    const audit = createAuditRepository(t.db);
    const mine = entry("2026-01-01T00:00:00.000Z");
    await audit.append(mine);
    await audit.append(
      entry("2026-01-01T00:00:00.000Z", {
        key: "other",
        after: flag({ key: "other" }),
      }),
    );
    expect(await audit.listByKey("new-checkout")).toStrictEqual([mine]);
  });

  it("lists oldest first, keeping insertion order for equal times", async () => {
    const audit = createAuditRepository(t.db);
    const late = entry("2026-01-03T00:00:00.000Z");
    const early = entry("2026-01-01T00:00:00.000Z");
    const tieA = entry("2026-01-02T00:00:00.000Z", { actorId: "a" });
    const tieB = entry("2026-01-02T00:00:00.000Z", { actorId: "b" });
    const tieC = entry("2026-01-02T00:00:00.000Z", { actorId: "c" });
    for (const e of [late, tieA, early, tieB, tieC]) await audit.append(e);
    expect(await audit.listByKey("new-checkout")).toStrictEqual([
      early,
      tieA,
      tieB,
      tieC,
      late,
    ]);
  });

  it("throws when a stored entry is malformed", async () => {
    await t.db
      .collection("audit")
      .insertOne({ key: "broken", at: "yesterday", after: null });
    await expect(
      createAuditRepository(t.db).listByKey("broken"),
    ).rejects.toThrow();
  });
});
