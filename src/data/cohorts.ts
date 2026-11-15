import type { Db } from "mongodb";
import { DuplicateCohortError, isDuplicateKeyError } from "./errors";
import { type Cohort, CohortSchema } from "./schemas";

export interface CohortsRepository {
  get(key: string): Promise<Cohort | null>;
  /** Every cohort, sorted by `key`. */
  list(): Promise<Cohort[]>;
  /** Throws `DuplicateCohortError` if a cohort with `cohort.key` exists. */
  create(cohort: Cohort): Promise<Cohort>;
  /** Replaces `name` and `description`; `null` when there is no such cohort (never creates one). */
  update(cohort: Cohort): Promise<Cohort | null>;
  /** `true` if a cohort was removed. */
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export function createCohortsRepository(db: Db): CohortsRepository {
  const cohorts = db.collection<Cohort>("cohorts");

  return {
    async get(key) {
      const doc = await cohorts.findOne({ key });
      return doc && CohortSchema.parse(doc);
    },

    async list() {
      const docs = await cohorts.find().sort({ key: 1 }).toArray();
      return docs.map((doc) => CohortSchema.parse(doc));
    },

    async create({ key, name, description }) {
      const cohort: Cohort = { key, name, description };
      try {
        await cohorts.insertOne({ ...cohort });
      } catch (error) {
        if (isDuplicateKeyError(error)) throw new DuplicateCohortError(key);
        throw error;
      }
      return cohort;
    },

    async update({ key, name, description }) {
      const doc = await cohorts.findOneAndUpdate(
        { key },
        { $set: { name, description } },
        { returnDocument: "after" },
      );
      return doc && CohortSchema.parse(doc);
    },

    async delete(key) {
      const { deletedCount } = await cohorts.deleteOne({ key });
      return deletedCount === 1;
    },

    async clear() {
      await cohorts.deleteMany({});
    },
  };
}
