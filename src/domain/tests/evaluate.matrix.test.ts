import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { bucket } from "../bucket";
import { evaluate } from "../evaluate";
import type { EvaluationResult, Flag } from "../types";

const KEY = "matrix-flag";
const PERCENTAGE = 50;

function userWhere(predicate: (b: number) => boolean): string {
  for (let i = 0; ; i++) {
    const userId = `user-${i}`;
    if (predicate(bucket(KEY, userId))) return userId;
  }
}

interface Row {
  exists: boolean;
  enabled: boolean;
  excluded: boolean;
  included: boolean;
  sticky: boolean;
  stored: boolean | undefined;
  belowPercentage: boolean;
}

/** The rule table from `specs/mission.md` → "Evaluation rules", read top to bottom. */
function expected(row: Row): EvaluationResult {
  if (!row.exists)
    return { enabled: false, reason: "FLAG_NOT_FOUND", persist: false };
  if (!row.enabled)
    return { enabled: false, reason: "KILL_SWITCH", persist: false };
  if (row.excluded)
    return { enabled: false, reason: "COHORT_EXCLUDED", persist: false };
  if (row.included)
    return { enabled: true, reason: "COHORT_INCLUDED", persist: false };
  if (row.sticky && row.stored !== undefined) {
    return { enabled: row.stored, reason: "STICKY", persist: false };
  }
  return {
    enabled: row.belowPercentage,
    reason: "PERCENTAGE",
    persist: row.sticky,
  };
}

const bools = [false, true];
const rows: Row[] = [];
for (const exists of bools)
  for (const enabled of bools)
    for (const excluded of bools)
      for (const included of bools)
        for (const sticky of bools)
          for (const stored of [undefined, false, true])
            for (const belowPercentage of bools)
              rows.push({
                exists,
                enabled,
                excluded,
                included,
                sticky,
                stored,
                belowPercentage,
              });

describe("evaluate precedence matrix", () => {
  it.each(rows)("%o", (row) => {
    const flag: Flag | null = row.exists
      ? {
          key: KEY,
          enabled: row.enabled,
          percentage: PERCENTAGE,
          includeCohorts: ["beta"],
          excludeCohorts: ["internal"],
          sticky: row.sticky,
        }
      : null;
    const cohorts = [
      ...(row.excluded ? ["internal"] : []),
      ...(row.included ? ["beta"] : []),
      "unrelated",
    ];
    const userId = userWhere((b) => b < PERCENTAGE === row.belowPercentage);

    expect(evaluate(flag, { userId, cohorts }, row.stored)).toEqual(
      expected(row),
    );
  });
});

const cohortArb = fc.constantFrom("a", "b", "c", "d");
const flagArb = fc.record<Flag>({
  key: fc.string(),
  enabled: fc.boolean(),
  percentage: fc.integer({ min: 0, max: 100 }),
  includeCohorts: fc.uniqueArray(cohortArb),
  excludeCohorts: fc.uniqueArray(cohortArb),
  sticky: fc.boolean(),
});
const ctxArb = fc.record({
  userId: fc.string(),
  cohorts: fc.uniqueArray(cohortArb),
});
const storedArb = fc.option(fc.boolean(), { nil: undefined });

const matches = (flagCohorts: string[], userCohorts: string[]) =>
  userCohorts.some((c) => flagCohorts.includes(c));

describe("evaluate properties", () => {
  it("is deterministic", () => {
    fc.assert(
      fc.property(
        fc.option(flagArb, { nil: null }),
        ctxArb,
        storedArb,
        (flag, ctx, stored) => {
          expect(evaluate(flag, ctx, stored)).toEqual(
            evaluate(flag, ctx, stored),
          );
        },
      ),
    );
  });

  it("asks to persist only for percentage results on sticky flags", () => {
    fc.assert(
      fc.property(flagArb, ctxArb, storedArb, (flag, ctx, stored) => {
        const result = evaluate(flag, ctx, stored);
        expect(result.persist).toBe(
          result.reason === "PERCENTAGE" && flag.sticky,
        );
      }),
    );
  });

  it("always applies the kill switch", () => {
    fc.assert(
      fc.property(flagArb, ctxArb, storedArb, (flag, ctx, stored) => {
        const result = evaluate({ ...flag, enabled: false }, ctx, stored);
        expect(result).toEqual({
          enabled: false,
          reason: "KILL_SWITCH",
          persist: false,
        });
      }),
    );
  });

  it("lets exclusion beat inclusion when the kill switch is off", () => {
    fc.assert(
      fc.property(flagArb, ctxArb, storedArb, (flag, ctx, stored) => {
        const f = { ...flag, enabled: true };
        fc.pre(matches(f.excludeCohorts, ctx.cohorts));
        expect(evaluate(f, ctx, stored).reason).toBe("COHORT_EXCLUDED");
      }),
    );
  });

  it("is off at 0% and on at 100% without a cohort match or stored value", () => {
    fc.assert(
      fc.property(flagArb, fc.string(), (flag, userId) => {
        const ctx = { userId, cohorts: [] };
        expect(
          evaluate({ ...flag, enabled: true, percentage: 0 }, ctx).enabled,
        ).toBe(false);
        expect(
          evaluate({ ...flag, enabled: true, percentage: 100 }, ctx).enabled,
        ).toBe(true);
      }),
    );
  });

  it("never turns a user off when the percentage is raised", () => {
    fc.assert(
      fc.property(
        flagArb,
        fc.string(),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (flag, userId, p1, p2) => {
          const [low, high] = p1 <= p2 ? [p1, p2] : [p2, p1];
          const f = { ...flag, enabled: true, sticky: false };
          const ctx = { userId, cohorts: [] };
          if (evaluate({ ...f, percentage: low }, ctx).enabled) {
            expect(evaluate({ ...f, percentage: high }, ctx).enabled).toBe(
              true,
            );
          }
        },
      ),
    );
  });

  it("keeps a stored sticky value whatever the percentage", () => {
    fc.assert(
      fc.property(
        flagArb,
        ctxArb,
        fc.boolean(),
        fc.integer({ min: 0, max: 100 }),
        (flag, ctx, stored, percentage) => {
          const f = { ...flag, enabled: true, sticky: true, percentage };
          fc.pre(
            !matches(f.excludeCohorts, ctx.cohorts) &&
              !matches(f.includeCohorts, ctx.cohorts),
          );
          expect(evaluate(f, ctx, stored)).toEqual({
            enabled: stored,
            reason: "STICKY",
            persist: false,
          });
        },
      ),
    );
  });
});
