import type { Db } from "mongodb";
import { resetFlagsAndAssignments } from "../data";

export interface ResetService {
  /**
   * Deletes every flag and sticky assignment and freezes the clock at `now`. The audit log, users
   * and cohorts are kept; seed flags are not re-inserted.
   */
  reset(now: Date): Promise<void>;
}

export interface ResetServiceDeps {
  db: Db;
  freezeClock(at: Date): void;
}

export function createResetService({
  db,
  freezeClock,
}: ResetServiceDeps): ResetService {
  return {
    async reset(now) {
      await resetFlagsAndAssignments(db);
      freezeClock(now);
    },
  };
}
