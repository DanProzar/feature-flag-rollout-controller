import type { Db } from "mongodb";
import type { Clock, Flag } from "../domain";
import { type FlagDocument, FlagSchema } from "./schemas";

export interface FlagsRepository {
  /** The flag with `key`, or `null` if there is none. */
  get(key: string): Promise<Flag | null>;
  /** Every flag, sorted by `key`. */
  list(): Promise<Flag[]>;
  /**
   * Creates or fully replaces the flag with `flag.key`; returns the previous flag, or `null` when
   * it was created.
   */
  upsert(flag: Flag): Promise<Flag | null>;
  /** Removes the flag with `key`; returns it, or `null` when there was none. */
  delete(key: string): Promise<Flag | null>;
}

export function createFlagsRepository(db: Db, clock: Clock): FlagsRepository {
  const flags = db.collection<FlagDocument>("flags");

  return {
    async get(key) {
      const doc = await flags.findOne({ key });
      return doc && FlagSchema.parse(doc);
    },

    async list() {
      const docs = await flags.find().sort({ key: 1 }).toArray();
      return docs.map((doc) => FlagSchema.parse(doc));
    },

    async upsert({
      key,
      enabled,
      percentage,
      includeCohorts,
      excludeCohorts,
      sticky,
    }) {
      const now = clock.now();
      const before = await flags.findOneAndUpdate(
        { key },
        {
          $set: {
            enabled,
            percentage,
            includeCohorts,
            excludeCohorts,
            sticky,
            updatedAt: now,
          },
          $setOnInsert: { key, createdAt: now },
        },
        { upsert: true, returnDocument: "before" },
      );
      return before && FlagSchema.parse(before);
    },

    async delete(key) {
      const doc = await flags.findOneAndDelete({ key });
      return doc && FlagSchema.parse(doc);
    },
  };
}
