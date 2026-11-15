import { bucket } from "./bucket";
import type { EvaluationContext, EvaluationResult, Flag } from "./types";

/**
 * Evaluates a flag for a user using the rules in `specs/mission.md`; the first matching rule wins.
 * `stickyValue` is the user's stored assignment, if any; it is only used for sticky flags.
 */
export function evaluate(
  flag: Flag | null,
  ctx: EvaluationContext,
  stickyValue?: boolean,
): EvaluationResult {
  if (flag === null)
    return { enabled: false, reason: "FLAG_NOT_FOUND", persist: false };
  if (!flag.enabled)
    return { enabled: false, reason: "KILL_SWITCH", persist: false };
  if (ctx.cohorts.some((c) => flag.excludeCohorts.includes(c))) {
    return { enabled: false, reason: "COHORT_EXCLUDED", persist: false };
  }
  if (ctx.cohorts.some((c) => flag.includeCohorts.includes(c))) {
    return { enabled: true, reason: "COHORT_INCLUDED", persist: false };
  }
  if (flag.sticky && stickyValue !== undefined) {
    return { enabled: stickyValue, reason: "STICKY", persist: false };
  }
  return {
    enabled: bucket(flag.key, ctx.userId) < flag.percentage,
    reason: "PERCENTAGE",
    persist: flag.sticky,
  };
}
