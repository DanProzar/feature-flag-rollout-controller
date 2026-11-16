import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seed } from "../../data";
import { useTestDb } from "../../data/tests/harness";
import { frozenClock } from "../../domain";
import { appClock } from "../clock";
import { createResetService } from "../reset";

const t = useTestDb();
const NOW = "2026-01-01T00:00:00.000Z";

beforeEach(() => t.clear());
afterEach(() => vi.restoreAllMocks());

async function counts() {
  const names = ["flags", "assignments", "audit", "users", "cohorts"];
  const entries = await Promise.all(
    names.map(async (name) => [
      name,
      await t.db.collection(name).countDocuments(),
    ]),
  );
  return Object.fromEntries(entries);
}

describe("reset service", () => {
  it("clears flags and assignments, keeps the rest, leaves the clock alone", async () => {
    await seed(t.db, frozenClock(new Date(NOW)));
    await t.db
      .collection("assignments")
      .insertOne({ flagKey: "new-checkout", userId: "u1", value: true });
    await t.db.collection("audit").insertOne({ key: "new-checkout" });
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const before = Date.now();
    await createResetService({ db: t.db }).reset(new Date(NOW));

    expect(await counts()).toEqual({
      flags: 0,
      assignments: 0,
      audit: 1,
      users: 6,
      cohorts: 4,
    });
    expect(info).toHaveBeenCalledWith(
      `Reset flags and sticky assignments at ${NOW}`,
    );
    expect(appClock.now().getTime()).toBeGreaterThanOrEqual(before);
  });
});
