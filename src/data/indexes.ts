import type { Db } from "mongodb";

/** Creates every index the repositories rely on. Idempotent; the only place indexes are made. */
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("flags").createIndex({ key: 1 }, { unique: true }),
    db
      .collection("assignments")
      .createIndex({ flagKey: 1, userId: 1 }, { unique: true }),
    db.collection("audit").createIndex({ key: 1, at: 1, _id: 1 }),
    db.collection("users").createIndex({ userId: 1 }, { unique: true }),
    db.collection("cohorts").createIndex({ key: 1 }, { unique: true }),
  ]);
}
