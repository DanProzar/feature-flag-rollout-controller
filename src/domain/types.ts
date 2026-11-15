/** A feature flag's rollout rules, as defined in `specs/mission.md`. */
export interface Flag {
  key: string;
  /** Kill-switch master: `false` forces the flag off for everyone. */
  enabled: boolean;
  /** Integer 0–100: share of users bucketed on. */
  percentage: number;
  includeCohorts: string[];
  excludeCohorts: string[];
  /** Persist and reuse each user's percentage result. */
  sticky: boolean;
}

export interface EvaluationContext {
  userId: string;
  cohorts: string[];
}

export type Reason =
  | "FLAG_NOT_FOUND"
  | "KILL_SWITCH"
  | "COHORT_EXCLUDED"
  | "COHORT_INCLUDED"
  | "STICKY"
  | "PERCENTAGE";

export interface EvaluationResult {
  enabled: boolean;
  reason: Reason;
  /** `true` when the caller must store `enabled` as the user's sticky assignment. */
  persist: boolean;
}
