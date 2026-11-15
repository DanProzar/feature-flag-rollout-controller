import type { Db } from "mongodb";

/** Deletes every flag and sticky assignment; the audit log, users, cohorts and indexes are kept. */
export async function resetFlagsAndAssignments(db: Db): Promise<void> {
  await Promise.all([
    db.collection("flags").deleteMany({}),
    db.collection("assignments").deleteMany({}),
  ]);
}
