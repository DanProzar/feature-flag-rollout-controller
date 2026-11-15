import type { Db } from "mongodb";
import { type AuditEntry, AuditEntrySchema } from "./schemas";

export interface AuditRepository {
  /** Appends `entry` as given; the caller supplies every field. */
  append(entry: AuditEntry): Promise<void>;
  /** The entries for `key`, oldest first (`at`, then insertion order); `[]` if there are none. */
  listByKey(key: string): Promise<AuditEntry[]>;
}

export function createAuditRepository(db: Db): AuditRepository {
  const audit = db.collection<AuditEntry>("audit");

  return {
    async append(entry) {
      // Copy: insertOne adds `_id` to the object it is given.
      await audit.insertOne({ ...entry });
    },

    async listByKey(key) {
      // `_id` breaks ties: ObjectIds increase in insertion order.
      const docs = await audit.find({ key }).sort({ at: 1, _id: 1 }).toArray();
      return docs.map((doc) => AuditEntrySchema.parse(doc));
    },
  };
}
