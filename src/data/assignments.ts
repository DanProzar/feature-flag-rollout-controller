import type { Db } from "mongodb";
import type { Clock } from "../domain";
import { isDuplicateKeyError } from "./errors";
import { type AssignmentDocument, AssignmentDocumentSchema } from "./schemas";

export interface AssignmentsRepository {
  /** The user's stored sticky value for the flag, or `undefined` when there is none. */
  get(flagKey: string, userId: string): Promise<boolean | undefined>;
  /**
   * Stores `value` unless the user already has one for the flag; returns the value actually
   * stored. Concurrent callers all get the first writer's value.
   */
  insertIfAbsent(
    flagKey: string,
    userId: string,
    value: boolean,
  ): Promise<boolean>;
  /** Removes every user's stored value for the flag. */
  deleteByFlag(flagKey: string): Promise<void>;
}

export function createAssignmentsRepository(
  db: Db,
  clock: Clock,
): AssignmentsRepository {
  const assignments = db.collection<AssignmentDocument>("assignments");

  return {
    async get(flagKey, userId) {
      const doc = await assignments.findOne({ flagKey, userId });
      return doc ? AssignmentDocumentSchema.parse(doc).value : undefined;
    },

    async insertIfAbsent(flagKey, userId, value) {
      try {
        const doc = await assignments.findOneAndUpdate(
          { flagKey, userId },
          { $setOnInsert: { value, createdAt: clock.now() } },
          { upsert: true, returnDocument: "after" },
        );
        return AssignmentDocumentSchema.parse(doc).value;
      } catch (error) {
        // Two concurrent upserts can both miss and race on the unique index; the loser re-reads
        // the winner's value.
        if (!isDuplicateKeyError(error)) throw error;
        const doc = await assignments.findOne({ flagKey, userId });
        return AssignmentDocumentSchema.parse(doc).value;
      }
    },

    async deleteByFlag(flagKey) {
      await assignments.deleteMany({ flagKey });
    },
  };
}
