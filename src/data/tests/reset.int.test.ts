import { beforeEach, describe, expect, it } from "vitest";
import { type Flag, frozenClock } from "../../domain";
import { createAssignmentsRepository } from "../assignments";
import { createAuditRepository } from "../audit";
import { createFlagsRepository } from "../flags";
import { resetFlagsAndAssignments } from "../reset";
import { useTestDb } from "./harness";

const t = useTestDb();
const clock = frozenClock(new Date("2026-01-01T00:00:00.000Z"));

const FLAG: Flag = {
  key: "new-checkout",
  enabled: true,
  percentage: 50,
  includeCohorts: [],
  excludeCohorts: [],
  sticky: true,
};

beforeEach(async () => {
  await t.clear();
  await createFlagsRepository(t.db, clock).upsert(FLAG);
  await createAssignmentsRepository(t.db, clock).insertIfAbsent(
    FLAG.key,
    "u1",
    true,
  );
  await createAuditRepository(t.db).append({
    at: clock.now(),
    key: FLAG.key,
    actorId: null,
    before: null,
    after: FLAG,
  });
  await t.db.collection("users").insertOne({ userId: "u1", name: "Alice" });
});

describe("resetFlagsAndAssignments", () => {
  it("empties flags and assignments only", async () => {
    await resetFlagsAndAssignments(t.db);
    expect(await t.db.collection("flags").countDocuments()).toBe(0);
    expect(await t.db.collection("assignments").countDocuments()).toBe(0);
    expect(await t.db.collection("audit").countDocuments()).toBe(1);
    expect(await t.db.collection("users").countDocuments()).toBe(1);
  });

  it("keeps the unique indexes", async () => {
    await resetFlagsAndAssignments(t.db);
    const flags = t.db.collection("flags");
    await flags.insertOne({ key: "k" });
    await expect(flags.insertOne({ key: "k" })).rejects.toThrow(/E11000/);
    const assignments = t.db.collection("assignments");
    await assignments.insertOne({ flagKey: "k", userId: "u" });
    await expect(
      assignments.insertOne({ flagKey: "k", userId: "u" }),
    ).rejects.toThrow(/E11000/);
  });
});
