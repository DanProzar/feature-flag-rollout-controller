import type { Db } from "mongodb";
import { resetFlagsAndAssignments } from "../data";

export interface ResetService {
  /**
   * Deletes every flag and sticky assignment and logs `now` as the reset time; the clock is not
   * touched. The audit log, users and cohorts are kept; seed flags are not re-inserted.
   */
  reset(now: Date): Promise<void>;
}

export interface ResetServiceDeps {
  db: Db;
}

export function createResetService({ db }: ResetServiceDeps): ResetService {
  return {
    async reset(now) {
      await resetFlagsAndAssignments(db);
      console.info(
        `Reset flags and sticky assignments at ${now.toISOString()}`,
      );
    },
  };
}
